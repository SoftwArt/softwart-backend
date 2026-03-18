import { RequestHandler } from "express";

const allowedOrigins = (process.env.CORS_ORIGIN ?? "*")
  .split(",")
  .map(o => o.trim());

export const corsMiddleware: RequestHandler = (req, res, next) => {
  const origin = req.headers.origin ?? "";
  const allow  = allowedOrigins.includes("*") ? "*"
    : allowedOrigins.includes(origin) ? origin
    : allowedOrigins[0];

  res.setHeader("Access-Control-Allow-Origin", allow);
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }
  next();
};
