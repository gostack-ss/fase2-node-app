import { getRepository, getCustomRepository, In } from 'typeorm';
import csvParse from 'csv-parse';
import fs from 'fs';

import Transaction from '../models/Transaction';
import Category from '../models/Category';
import TransactionRepository from '../repositories/TransactionsRepository';

interface CSVTransaction {
  title: string;
  type: 'income' | 'outcome';
  value: number;
  category: string;
}

class ImportTransactionsService {
  async execute(filePath: string): Promise<Transaction[]> {
    const transactionsFile = fs.createReadStream(filePath);

    const csv = csvParse({
      delimiter: ',',
      from_line: 2,
    });

    const csvParsed = transactionsFile.pipe(csv);

    const transactions: CSVTransaction[] = [];
    const categories: string[] = [];

    csvParsed.on('data', async line => {
      const [title, type, value, category] = line.map((cell: string) =>
        cell.trim(),
      );
      if (!title || !type || !value) return;

      categories.push(category);
      transactions.push({ title, type, value, category });
    });

    await new Promise(resolve => csvParsed.on('end', resolve));

    const categoryRepository = getRepository(Category);
    const transactionRepository = getCustomRepository(TransactionRepository);

    const existCategory = await categoryRepository.find({
      where: {
        title: In(categories),
      },
    });

    const existTitleCategories = existCategory.map(
      (category: Category) => category.title,
    );

    const addCategoryTitles = categories
      .filter(category => !existTitleCategories.includes(category))
      .filter((value, index, self) => self.indexOf(value) === index);

    const addNewCategories = addCategoryTitles.map(title => ({ title }));

    const newCategories = await categoryRepository.create(addNewCategories);

    await categoryRepository.save(newCategories);

    const finalCategories = [...newCategories, ...existCategory];

    const createdTransaction = transactionRepository.create(
      transactions.map(transaction => ({
        title: transaction.title,
        type: transaction.type,
        value: transaction.value,
        category: finalCategories.find(
          category => category.title === transaction.category,
        ),
      })),
    );

    await transactionRepository.save(createdTransaction);

    await fs.promises.unlink(filePath);

    return createdTransaction;
  }
}

export default ImportTransactionsService;
