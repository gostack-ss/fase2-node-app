import { getRepository, getCustomRepository } from 'typeorm';
import AppError from '../errors/AppError';

import TransactionRepository from '../repositories/TransactionsRepository';
import Transaction from '../models/Transaction';
import Category from '../models/Category';

interface RequestDTO {
  title: string;
  value: number;
  type: 'income' | 'outcome';
  category: string;
}
class CreateTransactionService {
  public async execute({
    title,
    value,
    type,
    category,
  }: RequestDTO): Promise<Transaction> {
    const transactionRepository = getCustomRepository(TransactionRepository);
    const categoryRepository = getRepository(Category);

    const transactionData = {
      title,
      value,
      type,
      category_id: '',
    };

    const balance = await transactionRepository.getBalance();

    if (type === 'outcome' && balance.total < value) {
      throw new AppError('saldo insuficiente', 400);
    }
    const categoryExist = await categoryRepository.findOne({
      where: {
        title: category,
      },
    });

    if (categoryExist) {
      transactionData.category_id = categoryExist.id;
    } else {
      const newCategory = await categoryRepository.create({
        title: category,
      });

      const cat = await categoryRepository.save(newCategory);

      transactionData.category_id = cat.id;
    }

    const transaction = transactionRepository.create(transactionData);
    await transactionRepository.save(transaction);

    return transaction;
  }
}

export default CreateTransactionService;
