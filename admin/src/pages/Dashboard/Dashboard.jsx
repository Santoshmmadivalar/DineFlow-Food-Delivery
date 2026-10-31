import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import "./Dashboard.css";

const inr = (n) => "₹" + Math.round(n).toLocaleString("en-IN");
const dayKey = (d) => new Date(d).toLocaleDateString("en-CA"); // yyyy-mm-dd in local time
const STATUSES = ["Food Processing", "Out for delivery", "Delivered"];
const METHOD = { cod: "Cash on delivery", razorpay: "Razorpay", stripe: "Card (Stripe)" };

const Dashboard = ({ url }) => {
  const [orders, setOrders] = useState([]);
  const [dishes, setDishes] = useState([]);
  const [range, setRange] = useState(7);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const [o, f] = await Promise.all([axios.get(url + "/api/order/list"), axios.get(url + "/api/food/list")]);
      if (o.data.success) setOrders(o.data.data);
      if (f.data.success) setDishes(f.data.data);
      setError("");
    } catch {
      setError("Could not reach the server. Check that the backend is running.");
    }
    setLoading(false);
  }, [url]);

  useEffect(() => {
    load();
    const t = setInterval(load, 15000); // keep the numbers live
    return () => clearInterval(t);
  }, [load]);

  const d = useMemo(() => {
    const today = dayKey(new Date());
    const paid = orders.filter((o) => o.payment);
    const days = [];
    for (let i = range - 1; i >= 0; i--) {
      const dt = new Date();
      dt.setDate(dt.getDate() - i);
      days.push({ key: dayKey(dt), label: dt.toLocaleDateString("en-IN", { day: "numeric", month: "short" }), revenue: 0, count: 0 });
    }
    orders.forEach((o) => {
      const day = days.find((x) => x.key === dayKey(o.date));
      if (day) {
        day.count += 1;
        if (o.payment) day.revenue += o.amount;
      }
    });
    const dishCount = {};
    orders.forEach((o) => o.items.forEach((i) => (dishCount[i.name] = (dishCount[i.name] || 0) + i.quantity)));
    const top = Object.entries(dishCount).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const byStatus = STATUSES.map((s) => [s, orders.filter((o) => o.status === s).length]);
    const byMethod = Object.keys(METHOD).map((m) => [METHOD[m], orders.filter((o) => (o.paymentMethod || "cod") === m).length]);
    return {
      total: orders.length,
      today: orders.filter((o) => dayKey(o.date) === today).length,
      active: orders.filter((o) => o.status !== "Delivered").length,
      revenue: paid.reduce((s, o) => s + o.amount, 0),
      avg: paid.length ? paid.reduce((s, o) => s + o.amount, 0) / paid.length : 0,
      cashDue: orders.filter((o) => !o.payment && (o.paymentMethod || "cod") === "cod").reduce((s, o) => s + o.amount, 0),
      days, top, byStatus, byMethod,
      maxRev: Math.max(1, ...days.map((x) => x.revenue)),
      recent: orders.slice(0, 5),
    };
  }, [orders, range]);

  if (loading) return <div className="dash">Loading dashboard...</div>;

  const maxTop = Math.max(1, ...d.top.map((t) => t[1]));
  const maxStatus = Math.max(1, ...d.byStatus.map((s) => s[1]));

  return (
    <div className="dash">
      <div className="dash-head">
        <h3>Dashboard</h3>
        <select value={range} onChange={(e) => setRange(Number(e.target.value))} aria-label="Chart range">
          <option value={7}>Last 7 days</option>
          <option value={14}>Last 14 days</option>
          <option value={30}>Last 30 days</option>
        </select>
      </div>
      {error && <p className="dash-err" role="alert">{error}</p>}

      <div className="dash-cards">
        <div className="dash-card"><b>{inr(d.revenue)}</b><span>Paid revenue</span></div>
        <div className="dash-card"><b>{d.total}</b><span>All orders</span></div>
        <div className="dash-card"><b>{d.today}</b><span>Orders today</span></div>
        <div className="dash-card"><b>{d.active}</b><span>In progress</span></div>
        <div className="dash-card"><b>{inr(d.avg)}</b><span>Average paid order</span></div>
        <div className="dash-card"><b>{inr(d.cashDue)}</b><span>Cash to collect</span></div>
        <div className="dash-card"><b>{dishes.length}</b><span>Dishes on menu</span></div>
      </div>

      <div className="dash-panel">
        <h4>Revenue per day</h4>
        <div className="bars" role="img" aria-label="Paid revenue per day">
          {d.days.map((x) => (
            <div key={x.key} className="bar-col" title={`${x.label}: ${inr(x.revenue)} from ${x.count} orders`}>
              <span className="bar-val">{x.revenue ? inr(x.revenue) : ""}</span>
              <div className="bar" style={{ height: `${(x.revenue / d.maxRev) * 100}%` }} />
              <small>{range > 14 ? x.label.split(" ")[0] : x.label}</small>
            </div>
          ))}
        </div>
      </div>

      <div className="dash-two">
        <div className="dash-panel">
          <h4>Top dishes</h4>
          {d.top.length === 0 && <p className="muted">No orders yet.</p>}
          {d.top.map(([name, n]) => (
            <div key={name} className="hrow"><span>{name}</span><div className="hbar"><i style={{ width: `${(n / maxTop) * 100}%` }} /></div><b>{n}</b></div>
          ))}
        </div>
        <div className="dash-panel">
          <h4>Orders by status</h4>
          {d.byStatus.map(([s, n]) => (
            <div key={s} className="hrow"><span>{s}</span><div className="hbar"><i style={{ width: `${(n / maxStatus) * 100}%` }} /></div><b>{n}</b></div>
          ))}
          <h4 style={{ marginTop: 16 }}>Payment methods</h4>
          {d.byMethod.map(([m, n]) => (
            <div key={m} className="hrow"><span>{m}</span><div className="hbar"><i style={{ width: `${(n / Math.max(1, d.total)) * 100}%` }} /></div><b>{n}</b></div>
          ))}
        </div>
      </div>

      <div className="dash-panel">
        <h4>Recent orders</h4>
        {d.recent.length === 0 && <p className="muted">No orders yet.</p>}
        {d.recent.map((o) => (
          <div key={o._id} className="recent">
            <span>{o.items.map((i) => `${i.name} × ${i.quantity}`).join(", ")}<small>{o.address.firstName} {o.address.lastName} · {new Date(o.date).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</small></span>
            <b>{inr(o.amount)}</b>
            <em className={o.payment ? "paid" : "due"}>{o.payment ? "Paid" : "Unpaid"}</em>
            <em>{o.status}</em>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
