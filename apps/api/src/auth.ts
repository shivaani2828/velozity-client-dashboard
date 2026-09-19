import jwt from 'jsonwebtoken'; import bcrypt from 'bcryptjs'; import { Request, Response, NextFunction } from 'express'; import { Role } from '@prisma/client';
const accessSecret=process.env.JWT_ACCESS_SECRET!, refreshSecret=process.env.JWT_REFRESH_SECRET!;
export type AuthRequest=Request & { user?: {id:string; role:Role} };
export const signAccess=(id:string,role:Role)=>jwt.sign({sub:id,role},accessSecret,{expiresIn:'15m'});
export const signRefresh=(id:string)=>jwt.sign({sub:id},refreshSecret,{expiresIn:'7d'});
export const hashToken=(token:string)=>bcrypt.hash(token,10); export const matchToken=(token:string,hash:string)=>bcrypt.compare(token,hash);
export function requireAuth(req:AuthRequest,res:Response,next:NextFunction){ const token=req.headers.authorization?.replace('Bearer ',''); if(!token)return res.status(401).json({error:{code:'UNAUTHENTICATED',message:'Access token required'}}); try { const p=jwt.verify(token,accessSecret) as {sub:string;role:Role}; req.user={id:p.sub,role:p.role}; next(); } catch {res.status(401).json({error:{code:'UNAUTHENTICATED',message:'Invalid or expired access token'}})} }
export const allow=(...roles:Role[]) => (req:AuthRequest,res:Response,next:NextFunction)=>!req.user||!roles.includes(req.user.role)?res.status(403).json({error:{code:'FORBIDDEN',message:'Insufficient permission'}}):next();
export const refreshCookie={httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax' as const,path:'/api/auth/refresh',maxAge:7*24*3600*1000};
