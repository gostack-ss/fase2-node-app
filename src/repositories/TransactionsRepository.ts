import { EntityRepository, Repository, getRepository } from 'typeorm';

import Transaction from '../models/Transaction';

interface Balance {
  income: number;
  outcome: number;
  total: number;
}

@EntityRepository(Transaction)
class TransactionsRepository extends Repository<Transaction> {
  public async getBalance(): Promise<Balance> {
    const transactionRepository = getRepository(Transaction);

    const transactions = await transactionRepository.find();

    const balance: Balance = {
      income: 0,
      outcome: 0,
      total: 0,
    };

    balance.income = transactions.reduce((accumulator, current) => {
      if (current.type === 'income') {
        return accumulator + Number(current.value);
      }
      return accumulator;
    }, 0);

    balance.outcome = transactions.reduce((accumulator, current) => {
      if (current.type === 'outcome') {
        console.log(current);
        return accumulator + Number(current.value);
      }
      return accumulator;
    }, 0);

    balance.total = balance.income - balance.outcome;

    return balance;
  }
}

export default TransactionsRepository;
