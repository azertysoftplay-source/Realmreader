class Task {
  static schema= [
            {
              name: 'Clients_details',
              properties: {
                _id: "string",
                Clients_id: "int",
                Clients_name: 'string',
                Clients_contact: 'string',
                balance:"balance[]",
                operation:'operation[]'
                
              },
              primaryKey:"_id"
             
            },
            {
              name:'balance',
          properties:{
            _id: "string",
            client_id:"string",
            balance_id:"int",
            value:"double",
            currency:"currency",
         
      
          },
          primaryKey:"_id"
          
        },
            {
              name:'operation',
          properties:{
            client_id:"string",
            _id:"string",
            operation_id: "int",
              type:"string",
              currency:'currency',
              value:"double",
              time:"date?",
              desc:"string?"
      
          },
          primaryKey:"_id"
         
        },{
          name:"currency",
          properties:{
            _id:"string",
            currency_id: "int",
            name:'string',
          },
          primaryKey:"_id"
        
        }
          ]
}

export const schemas = Task;
