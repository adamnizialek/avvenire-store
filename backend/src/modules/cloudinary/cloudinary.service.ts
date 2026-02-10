import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';

@Injectable()
export class CloudinaryService {
  constructor(private config: ConfigService) {
    cloudinary.config({
      cloud_name: this.config.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: this.config.get<string>('CLOUDINARY_API_KEY'),
      api_secret: this.config.get<string>('CLOUDINARY_API_SECRET'),
    });
  }

  async uploadImage(file: Express.Multer.File): Promise<string> {
    const result = await new Promise<UploadApiResponse>((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          { folder: 'avvenire', resource_type: 'image' },
          (error, result) => {
            if (error || !result) return reject(error);
            resolve(result);
          },
        )
        .end(file.buffer);
    });

    return result.secure_url;
  }
}
