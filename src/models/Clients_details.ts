export const Clients_details = {
  name: "Clients_details",
  primaryKey: "_id",
  properties: {
    _id: "string",
    Clients_id: "int",
    Clients_name: "string",
    Clients_contact: "string",
    balance: "balance[]",
    operation: "operation[]",
  },
};

export const balance = {
  name: "balance",
  primaryKey: "_id",
  properties: {
    _id: "string",
    client_id: "string",
    balance_id: "int",
    value: "double",
    currency: "currency",
  },
};

export const operation = {
  name: "operation",
  primaryKey: "_id",
  properties: {
    _id: "string",
    client_id: "string",
    operation_id: "int",
    type: "string",
    currency: "currency",
    value: "double",
    time: "date?",
    desc: "string?",
  },
};

export const currency = {
  name: "currency",
  primaryKey: "_id",
  properties: {
    _id: "string",
    currency_id: "int",
    name: "string",
  },
};
