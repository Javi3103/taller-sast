import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Category } from './entities/category.entity';
import { Repository } from 'typeorm';

@Injectable()
export class CategoryService {

  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
  ) { }



  async create(createCategoryDto: CreateCategoryDto): Promise<Category> {

    const name = createCategoryDto.name.trim().toLowerCase();
    const exists = await this.categoryRepository.findOneBy({ name });
    if (exists) {
      throw new ConflictException('Category already exists');
    }
    createCategoryDto.name = name;
    const category = this.categoryRepository.create(createCategoryDto);
    return this.categoryRepository.save(category);
  }

  findAll(): Promise<Category[]> {
    return this.categoryRepository.find();
  }

  async findOne(id: string): Promise<Category> {
    const category = await this.categoryRepository.findOne({
      where: { id }
    })
    if (!category) {
      throw new NotFoundException('Category not found')
    }
    return category;
  }

  async update(id: string, updateCategoryDto: UpdateCategoryDto): Promise<Category> {
    const category = await this.findOne(id);

    if (updateCategoryDto.name && updateCategoryDto.name !== category.name) {
      const duplicate = await this.categoryRepository.findOneBy({ name: updateCategoryDto.name })
      if (duplicate) throw new ConflictException('Category already exists')
    }

    Object.assign(category, updateCategoryDto);

    return this.categoryRepository.save(category);
  }


  async remove(id: string): Promise<void> {
    const category = await this.findOne(id);
    await this.categoryRepository.remove(category)
  }
}
