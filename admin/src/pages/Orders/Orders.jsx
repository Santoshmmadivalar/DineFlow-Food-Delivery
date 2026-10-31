import React, { useCallback, useEffect, useMemo, useState } from "react";
import "./Orders.css";
import { toast } from "react-toastify";
import axios from "axios";
import { assets } from "../../assets/assets.js";

const STATUSES = ["Food Processing", "Out for delivery", "Delivered"];
const METHOD = { cod: "Cash on delivery", razorpay: "Razorpay", stripe: "Card (Stripe)", online: "Online" };
const when = (d) => new Date(d).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
const inr = (n) => "₹" + Math.round(n).toLocaleString("en-IN");

const Orders = ({ url }) => {
  const [orders, setOrders] = useState([]);
  const [status, setStatus] = useState("All");
  const [search, setSearch] = useState("");
  const [live, setLive] = useState(true);
  const [updated, setUpdated] = useState(null);
  const [openLog, setOpenLog] = useState(null);

  const fetchAllOrders = useCallback(async () => {
    try {
      const response = await axios.get(url + "/api/order/list");
      if (response.data.success) {
        setOrders(response.data.data);
        setUpdated(new Date());
      }
    } catch {
      /* keep the last list if the server is briefly unreachable */
    }
  }, [url]);

  useEffect(() => {
    fetchAllOrders();
    // Live view: refresh the order list every 10 seconds.
    if (!live) return;
    const t = setInterval(fetchAllOrders, 10000);
    return () => clearInterval(t);
  }, [fetchAllOrders, live]);

  const setOrderStatus = async (orderId, next) => {
    const response = await axios.post(url + "/api/order/status", { orderId, status: next });
    if (response.data.success) {
      toast.success(`Order marked: ${next}`);
      fetchAllOrders();
    } else toast.error(response.data.message || "Error");
  };

  const viewInvoice = async (orderId) => {
    const res = await axios.post(url + "/api/order/admin/invoice", { orderId });
    if (!res.data.success) return toast.error(res.data.message || "Error");
    const blob = new Blob([res.data.html], { type: "text/html" });
    window.open(URL.createObjectURL(blob), "_blank");
  };

  const resend = async (orderId) => {
    const res = await axios.post(url + "/api/order/admin/resend", { orderId });
    res.data.success ? toast.success(res.data.message) : toast.error(res.data.message || "Error");
  };

  const stats = useMemo(() => {
    const today = new Date().toDateString();
    return {
      total: orders.length,
      today: orders.filter((o) => new Date(o.date).toDateString() === today).length,
      active: orders.filter((o) => o.status !== "Delivered").length,
      revenue: orders.filter((o) => o.payment).reduce((s, o) => s + o.amount, 0),
    };
  }, [orders]);

  const shown = orders.filter((o) => {
    if (status !== "All" && o.status !== status) return false;
    const q = search.trim().toLowerCase();
    if (!q) return true;
    const a = o.address || {};
    return [a.firstName, a.lastName, a.phone, a.email, o._id, ...(o.items || []).map((i) => i.name)].join(" ").toLowerCase().includes(q);
  });

  return (
    <div className="order add">
      <div className="order-head">
        <h3>Orders</h3>
        <label className="live">
          <input type="checkbox" checked={live} onChange={(e) => setLive(e.target.checked)} />
          <span className={live ? "dot on" : "dot"} /> Live
          {updated && <small> · updated {updated.toLocaleTimeString("en-IN")}</small>}
        </label>
      </div>

      <div className="stat-row">
        <div className="stat"><b>{stats.total}</b><span>All orders</span></div>
        <div className="stat"><b>{stats.today}</b><span>Today</span></div>
        <div className="stat"><b>{stats.active}</b><span>In progress</span></div>
        <div className="stat"><b>{inr(stats.revenue)}</b><span>Paid revenue</span></div>
      </div>

      <div className="order-filters">
        <input placeholder="Search name, phone, email, dish or order ID" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search orders" />
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
          <option>All</option>
          {STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>

      <div className="order-list">
        {shown.length === 0 && <p className="empty">No orders match.</p>}
        {shown.map((order) => {
          const a = order.address || {};
          const idx = STATUSES.indexOf(order.status);
          const next = STATUSES[idx + 1];
          return (
            <div key={order._id} className="order-item">
              <img src={assets.parcel_icon} alt="" />
              <div>
                <p className="order-item-food">
                  {order.items.map((i) => `${i.name} x ${i.quantity}`).join(", ")}
                </p>
                {order.items.filter((i) => i.note).map((i, k) => (
                  <p key={k} className="order-note">Note for {i.name}: {i.note}</p>
                ))}
                <p className="order-item-name">{a.firstName + " " + a.lastName}</p>
                <div className="order-item-address">
                  <p>{a.street + ","}</p>
                  <p>{a.city + ", " + a.state + ", India - " + (a.zipCode || a.zipcode)}</p>
                </div>
                <p className="order-item-phone">{a.phone} · {a.email}</p>
                <p className="order-meta">#{String(order._id).slice(-8).toUpperCase()} · {when(order.date)}</p>
                <button className="link" onClick={() => setOpenLog(openLog === order._id ? null : order._id)}>
                  {openLog === order._id ? "Hide status log" : "Status log"}
                </button>
                {openLog === order._id && (
                  <ul className="log">
                    {(order.statusHistory?.length ? order.statusHistory : [{ status: order.status, at: order.date }]).map((h, k) => (
                      <li key={k}>{h.status} <small>{when(h.at)}</small></li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="order-money">
                <b>{inr(order.amount)}</b>
                {order.discount > 0 && <small>{order.coupon} −{inr(order.discount)}</small>}
                <small>{METHOD[order.paymentMethod] || order.paymentMethod}</small>
                <small className={order.payment ? "paid" : "due"}>{order.payment ? "Paid" : order.paymentMethod === "cod" ? "Cash due" : "Unpaid"}</small>
                {order.paymentId && <small title={order.paymentId}>ID {String(order.paymentId).slice(0, 14)}</small>}
              </div>
              <div className="order-actions">
                <select onChange={(e) => setOrderStatus(order._id, e.target.value)} value={order.status} aria-label="Order status">
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                {next && <button className="go" onClick={() => setOrderStatus(order._id, next)}>Mark: {next}</button>}
                <button className="link" onClick={() => viewInvoice(order._id)}>View invoice</button>
                {order.payment && <button className="link" onClick={() => resend(order._id)}>Email receipt again</button>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Orders;
