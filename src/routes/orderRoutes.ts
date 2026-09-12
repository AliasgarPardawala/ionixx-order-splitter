import { Router } from 'express';
import { createOrder, getOrder, listOrders } from '../controllers/orderController';

export const orderRoutes = Router();

orderRoutes.post('/', createOrder);
orderRoutes.get('/', listOrders);
orderRoutes.get('/:orderId', getOrder);
