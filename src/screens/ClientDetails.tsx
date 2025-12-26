import React, { useLayoutEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  SectionList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  FlatList,
  useColorScheme,
  Modal,
  TextInput,
} from "react-native";
import { Picker } from '@react-native-picker/picker';
import { Swipeable } from "react-native-gesture-handler";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useObject, useQuery, useRealm } from "@realm/react";
import moment from "moment";
import { ClientsDetails, Currency, Operation } from "../realm/types";
import { generatePDF } from 'react-native-html-to-pdf';
import Share from 'react-native-share';
import Icon from "../components/Icon";
import { operation } from "../models/Clients_details";
import { useTranslation } from "react-i18next";


/* ================= TYPES ================= */

type RouteParams = {
  clientId: string;
};

/* ================= THEMES ================= */

const LightTheme = {
  bg: "#FFF",
  card: "#FFF",
  text: "#000",
  border: "#E0E0E0",
  section: "#F4F4F4",
  primary: "#007AFF",
  danger: "#D32F2F",
  green: "#2E7D32",
  red: "#C62828",
};

const DarkTheme = {
  bg: "#000",
  card: "#1C1C1E",
  text: "#FFF",
  border: "#2C2C2E",
  section: "#2C2C2E",
  primary: "#0A84FF",
  danger: "#FF453A",
  green: "#30D158",
  red: "#FF453A",
};

/* ================= SCREEN ================= */

export default function ClientsDetailsScreen() {
  const realm = useRealm();
  const navigation = useNavigation();
  const route = useRoute();
  const { clientId } = route.params as RouteParams;
  const { t, i18n } = useTranslation();

  const scheme = useColorScheme();
  const theme = scheme === "dark" ? DarkTheme : LightTheme;

  /* ================= DATA ================= */

  const client = useObject<ClientsDetails>("Clients_details", clientId);
  const currencies = useQuery<Currency>("currency");
  const allOperations = useQuery<Operation>("operation")
    .filtered("client_id == $0", clientId)
    .sorted("time", true);

  const [currencyFilter, setCurrencyFilter] = useState<string | null>(null);

  /* ================= EDIT OPERATION ================= */
  const [editOp, setEditOp] = useState<any>(null);
  const [editValue, setEditValue] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editCurrency, setEditCurrency] = useState<any>(null);
  const [addOpVisible, setAddOpVisible] = useState(false);
const [newValue, setNewValue] = useState("");
const [newDesc, setNewDesc] = useState("");
const [newCurrency, setNewCurrency] = useState(currencies[0]);

  const openEditOperation = (op) => {
    setEditOp(op);
    setEditValue(String(op.value));
    setEditDesc(op.desc ?? "");
    setEditCurrency(op.currency);
  };

  const saveEditOperation = () => {
    if (!editOp) return;

    realm.write(() => {
      editOp.value = Number(editValue);
      editOp.desc = editDesc;
      editOp.currency = editCurrency;
    });

    setEditOp(null);
  };

  /* ================= HEADER ================= */

  useLayoutEffect(() => {
    navigation.setOptions({
      title: client?.Clients_name ?? "Client",
      headerStyle: { backgroundColor: theme.card },
      headerTintColor: theme.text,
      headerRight: () => (
        <View style={{  flexDirection: "row" , justifyContent: "space-between",
    width: 120}}>
          <Icon
            name="link"
            type="MaterialIcons"
            onPress={creatCheck}
            color={theme.primary}
          />
          <Icon
            name="share"
            onPress={ createPDF}
            color={theme.primary}
          />
           <Icon
    name="add"
    type="MaterialIcons"
    onPress={() => setAddOpVisible(true)}
    color={theme.primary}
  />
        </View>
      ),
    });
  }, [navigation, client, theme]);

  /* ================= FILTERED OPS ================= */

  const operations = useMemo(() => {
    if (!currencyFilter) return allOperations;
    return allOperations.filtered(
      "currency._id == $0 OR type == 'check'",
      currencyFilter
    );
  }, [allOperations, currencyFilter]);

  /* ================= GROUP BY DATE ================= */

  const sections = useMemo(() => {
    const groups: Record<string, any[]> = {};

    operations.forEach((op) => {
      const date = moment(op.time).format("DD/MM/YYYY");
      if (!groups[date]) groups[date] = [];
      groups[date].push(op);
    });

    return Object.keys(groups).map((date) => ({
      title: date,
      data: groups[date],
    }));
  }, [operations]);

  /* ================= BALANCE ================= */

  const getBalance = (currency) => {
    const sum = realm
      .objects("operation")
      .filtered(
        "client_id == $0 AND currency._id == $1 AND type != 'check'",
        clientId,
        currency._id
      )
      .sum("value");
    return Number(sum);
  };

  /* ================= ACTIONS ================= */
  const addOperation = () => {
    
    console.log('Adding operation with:', { newValue, newCurrency, newDesc });
  if (!newValue || !newCurrency) return;
   const amount = Number(newValue);

  // ❌ Not a number OR empty
  if (!Number.isFinite(amount)) {
    Alert.alert("Invalid amount", "Please enter a valid number");
    return;
  }

  if (!newCurrency) {
    Alert.alert("Missing currency", "Please select a currency");
    return;
  }

  realm.write(() => {
    realm.create("operation", {
      _id: `${Date.now()}`,
      client_id: clientId,
      operation_id: Date.now(),
      type: "normal",
      value: Number(newValue),
      time: new Date(),
      currency: newCurrency,
      desc: newDesc,
    });
  });

  setAddOpVisible(false);
  setNewValue("");
  setNewDesc("");
};

const creatCheck = () => {
  let desc = "";
  currencies.forEach((item) => {
    const sum = realm
      .objects("operation")
      .filtered(
        'client_id == $0 AND currency._id == $1 AND type != "check"',
        clientId,
        item._id
      )
      .sum("value") as number;
    const value = Number(sum).toFixed(2);
    const exist =
      realm
        .objects("operation")
        .filtered(
          'client_id == $0 AND currency._id == $1 AND type != "check"',
          clientId,
          item._id
        ).length > 0;
    if (exist) desc += `${value} ${item.name} |`;
  });

  realm.write(() => {
    realm.create("operation", {
      _id: `${Date.now()}`,
      client_id: clientId,
      operation_id: Date.now(),
      type: "check",
      value: 0,
      time: new Date(),
      currency: currencies[0],
      desc: desc || "Checkpoint",
    });
  });
};
  const deleteOperation = (op) => {
    Alert.alert("Delete", "Delete this operation?", [
      { text:i18n.t('common.text_cancel'), style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () =>
          realm.write(() => realm.delete(op)),
      },
    ]);
  };

 

  /* ================= RENDER ================= */

  const renderOperation = ({ item }) => {
    if (item.type === "check") {
      return (
        <View style={[
    styles.checkItem,
    {
      backgroundColor:
        scheme === "dark" ? "#5C4B00" : "#FFD54F",
    },
  ]}>
          <Text style={{ color: scheme === "dark" ? "#FFF" : "#000" }}>{item.desc}</Text>
        </View>
      );
    }

    return (
      <Swipeable
        renderRightActions={() => (
          <TouchableOpacity
            style={[styles.deleteBox, { backgroundColor: theme.danger }]}
            onPress={() => deleteOperation(item)}
          >
            <MaterialIcons name="delete" size={24} color="white" />
          </TouchableOpacity>
        )}
      >
        <TouchableOpacity
          style={[
            styles.operation,
            { backgroundColor: theme.card,
      borderColor: theme.border,
 },
          ]}
          onPress={() => openEditOperation(item)}
        >
          <Text
            style={{
              color: item.value >= 0 ? theme.green : theme.red,
              fontWeight: "700",
              width: 80,
            }}
          >
            {item.value}
          </Text>

          <Text style={{ width: 80 ,color: scheme === "dark" ? "#FFF" : "#000"}}>{item.currency.name}</Text>

 <Text style={{ color: scheme === "dark" ? "#FFF" : "#000",flex:1 }}>{item.desc}</Text>
          <Text style={{ width: 60 ,color: scheme === "dark" ? "#FFF" : "#000"}}>
            {moment(item.time).format("HH:mm")}
          </Text>
        </TouchableOpacity>
      </Swipeable>
    );
  };
  /* ================= pdf ================= */
  const htmlStyles = `

*{
  border: 0;
  box-sizing: content-box;
  color: inherit;
  font-family: inherit;
  font-size: inherit;
  font-style: inherit;
  font-weight: inherit;
  line-height: inherit;
  list-style: none;
  margin: 0;
  padding: 0;
  text-decoration: none;
  vertical-align: top;
}
h1 { font: bold 100% sans-serif; letter-spacing: 0.5em; text-align: center; text-transform: uppercase; }
/* table */
table { font-size: 75%; table-layout: fixed; width: 100%; }
table { border-collapse: separate; border-spacing: 2px; }
th, td { border-width: 1px; padding: 0.5em; position: relative; text-align: left; }
th, td { border-radius: 0.25em; border-style: solid; }
th { background: #EEE; border-color: #BBB; }
td { border-color: #DDD; }
/* page */
html { font: 16px/1 'Open Sans', sans-serif; overflow: auto; }
html { background: #999; cursor: default; }
html   { -webkit-print-color-adjust: exact; }
body { box-sizing: border-box;margin: 0 auto; overflow: hidden; padding: 0.25in; }
body { background: #FFF; border-radius: 1px; box-shadow: 0 0 1in -0.25in rgba(0, 0, 0, 0.5); }
/* header */
header { margin: 0 0 3em; }
header:after { clear: both; content: ""; display: table; }
header h1 { background: #000; border-radius: 0.25em; color: #FFF; margin: 0 0 1em; padding: 0.5em 0; }
header address { float: left; font-size: 75%; font-style: normal; line-height: 1.25; margin: 0 1em 1em 0; }
header address p { margin: 0 0 0.25em; }
header span, header img { display: block; float: right; }
header span { margin: 0 0 1em 1em; max-height: 25%; max-width: 60%; position: relative; }
header img { max-height: 100%; max-width: 100%; }
/* article */
article, article address, table.meta, table.inventory { margin: 0 0 3em; }
article:after { clear: both; content: ""; display: table; }
article h1 { clip: rect(0 0 0 0); position: absolute; }
article address { float: left; font-size: 125%; font-weight: bold; }
/* table meta & balance */
table.meta, table.balance { float: right; width: 36%; }
table.meta:after, table.balance:after { clear: both; content: ""; display: table; }
/* table meta */
table.meta th { width: 40%; }
table.meta td { width: 60%; }
/* table items */
table.inventory { clear: both; width: 100%; }
table.inventory th { font-weight: bold; text-align: center; }
table.inventory td:nth-child(1) { width: 26%; }
table.inventory td:nth-child(2) { width: 38%; }
table.inventory td:nth-child(3) { text-align: center; width: 12%; }
table.inventory td:nth-child(4) { text-align: center; width: 12%; }
table.inventory td:nth-child(5) { text-align: center; width: 12%; }
/* table balance */
table.balance th, table.balance td { width: 50%; }
table.balance td { text-align: right; }
/* aside */
aside h1 { border: none; border-width: 0 0 1px; margin: 0 0 1em; }
aside h1 { border-color: #999; border-bottom-style: solid; }
pageFooter
{
    page-break-before: always;
    counter-increment: page;
}
pageFooter:after
{
    display: block;
    text-align: right;
    content: "Page " counter(page);
}
pageFooter.first.page
{
    page-break-before: avoid;
}
`;
const balancescode=()=>{
    var balance=''
    currencies.map((item)=>{
    const somme=getBalance(item)
      if(somme>=0){
        balance=balance+` <th style="background-color:green;width: 50%;color:white"><span>${somme}  ${item.name}</span></th>`
      }else
      if(somme<0)

      balance=balance+` <th style="background-color:red;width: 50%;color:white"><span>${somme}  ${item.name}</span></th>`
    })
return balance
  } 
   const HTMLCODE=()=>{
    const opr=realm.objects('operation').filtered('client_id =$0 AND  type=="check"', clientId).sorted('time',true)
    if(opr.length>0){
      var list=realm.objects('operation').filtered('client_id =$0 AND  time>$1', clientId,opr[0].time)
    }
    else{
      var list=realm.objects('operation').filtered('client_id =$0', clientId).sorted('time',true)
    }
    var code=''
    list.map((item)=>{
      if(item.type=="check")
      code=  code + `<tr>
      <td  colspan="3" style="text-align: center;background-color:yellow;width:100%"><span>`+ item.desc+`<span></td>
     
  
    </tr>`
    else
    code=  code + `<tr>
      <td style="text-align: center;"><span>`+ item.value +`<span></td>
      <td style="text-align: center;"><span>`+item.currency?.name+`<span></td>
      <td style="text-align: center;"><span>`+item.desc+`<span></td>
      <td style="text-align: center;"><span>`+ moment(item.time).format('DD/MM/yy') +`<span></td>
    </tr>`

    })
    
    return code
  }
const  createPDF=async( ) =>{
    const htmlContent = `
    <html>
      <head>
        <meta charset="utf-8">
        <title>Invoice</title>
        <link rel="license" href="https://www.opensource.org/licenses/mit-license/">
        <style>
          ${htmlStyles}
        </style>
        <script type="text/javascript">
        function PrintPanel() {
            var panel = document.getElementById("content");
            var printWindow = window.open('', '', 'height=400,width=800');
            printWindow.document.write('<html><head><title></title>');
            printWindow.document.write('</head><body >');
            printWindow.document.write(panel.innerHTML);
            printWindow.document.write('</body></html>');
            printWindow.document.close();
            setTimeout(function () {
                printWindow.print();
                printWindow.close();
            }, 500);
            return false;
        }
    </script>
      </head>
      <body>
        <header>
          <h1>Invoice</h1>
         
        </header>
        <article>
          <h1>Recipient</h1>
          <address>
            <p>${client.Clients_name}  ${client.Clients_contact}</p>
          </address>
          <table class="meta">
          
            <tr>
              <th><span>Date</span></th>
              <td><span>${moment(new Date()).format('DD/MM/yy')}</span></td>
            </tr>
          
          </table>
          <table>
          <thead>
          <tr>`+balancescode()+`
          
          </tr>
        </thead>
          </table>

          <table class="inventory">
            <thead>
              <tr>
                <th><span>Ammount</span></th>
                <th><span>Currency</span></th>
                <th><span>details</span></th>
                <th><span>Date</span></th>
              </tr>
            </thead>
            <tbody>`+HTMLCODE()+`
             
            </tbody>
           
          </table>
          </article>
        
      </body>
     
     
     
    </html>
  `;
  
    let options = {
      html:  htmlContent,
      fileName: client.Clients_name+' '+client.Clients_contact+"_Daftarrr",
      directory: 'Documents',
      base64:true
    };

    let file = await generatePDF(options)
  
     Share.open({
      title: "This is my report ",
      url:"file://"+file.filePath+"",
      subject: "Report",
 }); 

   
  

  }
  

  /* ================= UI ================= */

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* BALANCES */}
      <FlatList
        horizontal
        data={currencies}
        keyExtractor={(i) => i._id}
        contentContainerStyle={{ padding: 10,height: 60 }}
        renderItem={({ item }) => {
          const value = getBalance(item);
          return (
            <TouchableOpacity
              onPress={() =>
                setCurrencyFilter(
                  currencyFilter === item._id ? null : item._id
                )
              }
              style={{
                backgroundColor: value >= 0? theme.green : theme.red,
                padding: 10,
                marginRight: 10,
                borderRadius: 10,
              }}
            >
              <Text style={{ color: "white" }}>
                {value.toFixed(2)} {item.name}
              </Text>
            </TouchableOpacity>
          );
        }}
      />

      {/* OPERATIONS */}
     <SectionList
  sections={sections}
  keyExtractor={(item) => item._id}
  renderSectionHeader={({ section }) => (
    <View
      style={[
        styles.sectionHeader,
        {
          backgroundColor: theme.section,
          borderBottomColor: theme.border,
        },
      ]}
    >
      <Text style={[styles.sectionText, { color: theme.text }]}>
        {section.title}
      </Text>
    </View>
  )}
  renderItem={renderOperation}
/>


      {/* ================= EDIT OPERATION MODAL ================= */}
      <Modal visible={!!editOp} transparent animationType="slide">
        <View style={modal.overlay}>
          <View style={[modal.card, { backgroundColor: theme.card }]}>
            <Text style={[modal.title, { color: theme.text }]}>
              {i18n.t('operation.text_add_operation3')}
            </Text>

            <View style={styles.amountRow}>
  {/* MINUS */}
  <TouchableOpacity
    style={[styles.signBtn, { backgroundColor: theme.red }]}
    onPress={() => {
      if (!editValue.startsWith("-")) {
        setEditValue(editValue ? `-${editValue}` : "-");
      }
    }}
  >
    <Text style={styles.signText}>−</Text>
  </TouchableOpacity>

  {/* INPUT */}
  <TextInput
    value={editValue}
    onChangeText={(t) => {
      // allow only numbers, dot, and minus at first position
      if (/^-?\d*\.?\d*$/.test(t)) setEditValue(t);
    }}
    keyboardType="numeric"
    placeholder={i18n.t("inputs.text_regular")}
    style={[styles.amountInput, { color: theme.text }]}
  />

  {/* PLUS */}
  <TouchableOpacity
    style={[styles.signBtn, { backgroundColor: theme.green }]}
    onPress={() => {
      if (editValue.startsWith("-")) {
        setEditValue(editValue.replace("-", ""));
      }
    }}
  >
    <Text style={styles.signText}>+</Text>
  </TouchableOpacity>
</View>

            <TextInput
              value={editDesc}
              onChangeText={setEditDesc}
              placeholder={i18n.t('inputs.text_description')}
              placeholderTextColor="#999"
              style={[
                modal.input,
                { borderColor: theme.border, color: theme.text },
              ]}
            />

            {/* CURRENCY SELECTOR */}
            <View
              style={[
                modal.input,
                { borderColor: theme.border, justifyContent: "center" },
              ]}
            >
              <Picker
                selectedValue={editCurrency?._id}
                onValueChange={(val) =>
                  setEditCurrency(currencies.find((c) => c._id === val) ?? currencies[0])
                }
              >
                {currencies.map((c) => (
                  <Picker.Item key={c._id} label={c.name} value={c._id} />
                ))}
              </Picker>

            </View>

            <View style={modal.actions}>
              <TouchableOpacity onPress={() => setEditOp(null)}>
                <Text style={{ color: theme.text }}>{t('common.text_cancel')}</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={saveEditOperation}>
                <Text style={{ color: theme.primary, fontWeight: "700" }}>
                  {i18n.t('common.text_button_save')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
            {/* ================= add OPERATION MODAL ================= */}

      <Modal visible={addOpVisible} transparent animationType="slide">
  <View style={modal.overlay}>
    <View style={[modal.card, { backgroundColor: theme.card }]}>
      <Text style={[modal.title, { color: theme.text }]}>
        {i18n.t('operation.text_add_operation')}
      </Text>
<View style={styles.amountRow}>
  {/* MINUS */}
  <TouchableOpacity
    style={[styles.signBtn, { backgroundColor: theme.red }]}
    onPress={() => {
      if (!newValue.startsWith("-")) {
        setNewValue(newValue ? `-${newValue}` : "-");
      }
    }}
  >
    <Text style={styles.signText}>−</Text>
  </TouchableOpacity>

  {/* INPUT */}
  <TextInput
    value={newValue}
    onChangeText={(t) => {
      // allow only numbers, dot, and minus at first position
      if (/^-?\d*\.?\d*$/.test(t)) setNewValue(t);
    }}
    keyboardType="numeric"
    placeholder={i18n.t("inputs.text_regular")}
    style={[styles.amountInput, { color: theme.text }]}
  />

  {/* PLUS */}
  <TouchableOpacity
    style={[styles.signBtn, { backgroundColor: theme.green }]}
    onPress={() => {
      if (newValue.startsWith("-")) {
        setNewValue(newValue.replace("-", ""));
      }
    }}
  >
    <Text style={styles.signText}>+</Text>
  </TouchableOpacity>
</View>


      <TextInput
        value={newDesc}
        onChangeText={setNewDesc}
        placeholder={i18n.t('inputs.text_description')}
        placeholderTextColor="#999"
        style={[modal.input, { borderColor: theme.border, color: theme.text }]}
      />

      <View style={[modal.input, { borderColor: theme.border }]}>
        <Picker
          selectedValue={newCurrency?._id}
          onValueChange={(val) =>
            setNewCurrency(currencies.find(c => c._id === val)!)
          }
        >
          {currencies.map(c => (
            <Picker.Item key={c._id} label={c.name} value={c._id} />
          ))}
        </Picker>
      </View>

      <View style={modal.actions}>
        <TouchableOpacity onPress={() => setAddOpVisible(false)}>
          <Text style={{ color: theme.text }}>{i18n.t('common.text_cancel')}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={addOperation}>
          <Text style={{ color: theme.primary, fontWeight: "700" }}>
            {i18n.t('common.text_button_save')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  </View>
</Modal>

    </View>
  );
}

/* ================= HELPERS ================= */

const IconBtn = ({ icon, onPress, color }) => (
  <TouchableOpacity onPress={onPress} style={{ marginHorizontal: 8 }}>
    <MaterialIcons name={icon} size={24} color={color} />
  </TouchableOpacity>
);

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  container: { flex: 1},
  section: {
    padding: 6,
    fontWeight: "700",
  },
  operation: {
    flexDirection: "row",
    padding: 12,
    borderBottomWidth: 1,
    alignItems: "center",
  },
  deleteBox: {
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 25,
  },
  checkItem: {
    backgroundColor: "#FFD54F",
    padding: 10,
    margin: 5,
    borderRadius: 6,
  },
    sectionHeader: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
  },
  sectionText: {
    fontWeight: "700",
    fontSize: 14,
  },
  amountRow: {
  flexDirection: "row",
  alignItems: "center",
  marginBottom: 10,
},
amountInput: {
  flex: 1,
  borderWidth: 1,
  borderRadius: 8,
  padding: 10,
  marginHorizontal: 8,
  textAlign: "center",
},
signBtn: {
  width: 44,
  height: 44,
  borderRadius: 22,
  justifyContent: "center",
  alignItems: "center",
},
signText: {
  color: "#fff",
  fontSize: 22,
  fontWeight: "700",
},

});

const modal = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  card: {
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 15,
  },
  
});
