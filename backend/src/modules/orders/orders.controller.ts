import { Controller, Get, Post, Body, Param, Request } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import type { AuthenticatedRequest } from '../auth/authenticated-request';

@Controller('orders')
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  @Post()
  create(@Body() dto: CreateOrderDto, @Request() req: AuthenticatedRequest) {
    return this.ordersService.create(req.user.userId, dto);
  }

  @Get()
  findAll(@Request() req: AuthenticatedRequest) {
    return this.ordersService.findByUserId(req.user.userId);
  }

  @Get('session/:sessionId')
  findBySession(
    @Param('sessionId') sessionId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.ordersService.findBySessionForUser(sessionId, req.user.userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.ordersService.findByIdForUser(id, req.user.userId);
  }
}
