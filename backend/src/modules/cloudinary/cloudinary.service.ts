import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';

@Injectable()
export class CloudinaryService {
  constructor(private config: ConfigService) {
    const url = this.config.get<string>('CLOUDINARY_URL');
    if (url) {
      const parsed = new URL(url.replace('cloudinary://', 'https://'));
      cloudinary.config({
        cloud_name: parsed.hostname,
        api_key: parsed.username,
        api_secret: parsed.password,
      });
    }
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
