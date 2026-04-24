import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodIssue } from "zod";

export const validate = (schema: ZodSchema) =>
  (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors = result.error.issues.map((e: ZodIssue) => `${e.path.join(".")}: ${e.message}`);
      res.status(422).json({ success: false, message: errors[0], errors });
      return;
    }
    req.body = result.data;
    next();
  };
