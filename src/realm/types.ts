export type Currency = {
  _id: string;
  currency_id: number;
  name: string;

  createdAt: Date;
  updatedAt: Date;
  deleted?: boolean;
};

export type Balance = {
  _id: string;
  client_id: string;
  balance_id: number;
  value: number;
  currency: Currency;

  createdAt: Date;
  updatedAt: Date;
  deleted?: boolean;
};

export type Operation = {
  _id: string;
  client_id: string;
  operation_id: number;
  type: string;
  currency: Currency;
  value: number;
  time?: Date;
  desc?: string;

  createdAt: Date;
  updatedAt: Date;
  deleted?: boolean;
};


export type ClientsDetails = {
  _id: string;
  Clients_id: number;
  Clients_name: string;
  Clients_contact: string;
  balance: Balance[];
  operation: Operation[];

  createdAt: Date;
  updatedAt: Date;
  deleted?: boolean;
};

