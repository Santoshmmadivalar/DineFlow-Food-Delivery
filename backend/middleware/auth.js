import jwt from 'jsonwebtoken';

const authMiddleware=async (req, res, next) => {
    const {token}= req.headers;//get token from headers
    if(!token){
        return res.json({success:false,message:"Not Authorized Login Again"});//if not token available
    }
    try{
        const token_decode=jwt.verify(token,process.env.JWT_SECRET);//verify token using secret key decode it
        req.body.userId=token_decode.id;//get user id from token
        next();
    }catch(error){
        res.json({success:false,message:"Not Authorized Login Again"});//invalid or expired token

    }

}

export default authMiddleware;