import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseInterceptors,
  UploadedFile,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ProductsService } from './products.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('products')
export class ProductsController {
  constructor(
    private productsService: ProductsService,
    private cloudinaryService: CloudinaryService,
  ) {}

  @Public()
  @Get()
  findAll(@Query('category') category?: string) {
    return this.productsService.findAll(category);
  }

  @Post('upload')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      fileFilter: (_req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
          cb(null, true);
        } else {
          cb(new Error('Only image files are allowed'), false);
        }
      },
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  async upload(@UploadedFile() file: Express.Multer.File) {
    const url = await this.cloudinaryService.uploadImage(file);
    return { url };
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin')
  create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productsService.findById(id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productsService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }
}
