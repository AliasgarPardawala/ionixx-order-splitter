import { Request, Response, NextFunction } from 'express';
import { createOrderSchema, listOrdersQuerySchema, orderIdParamSchema } from '../validation/orderSchemas';
import { orderService } from '../services/orderService';

export function createOrder(req: Request, res: Response, next: NextFunction): void {
  try {
    const input = createOrderSchema.parse(req.body);
    const order = orderService.create(input);
    res.status(201).json(order);
  } catch (err) {
    next(err);
  }
}

export function getOrder(req: Request, res: Response, next: NextFunction): void {
  try {
    const { orderId } = orderIdParamSchema.parse(req.params);
    const order = orderService.getById(orderId);
    res.status(200).json(order);
  } catch (err) {
    next(err);
  }
}

export function listOrders(req: Request, res: Response, next: NextFunction): void {
  try {
    const query = listOrdersQuerySchema.parse(req.query);
    const { data, total } = orderService.list(query);
    res.status(200).json({ data, pagination: { page: query.page, limit: query.limit, total } });
  } catch (err) {
    next(err);
  }
}
