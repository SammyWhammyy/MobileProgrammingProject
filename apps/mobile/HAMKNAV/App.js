import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View, Image } from "react-native";
import commonStyles from "./commonStyles";
import SearchDropdown from "./Components/DropDown.js";

export default function App() {
  const data = [{ place: "113" }, { place: "227" }, { place: "556" }];
  const onSelect = (item) => {
    console.log("Selected item:", item);
  };
  return (
    <View style={commonStyles.container}>
      <View style={commonStyles.header}>
        <Image
          source={require("./Images/logo.png")}
          style={commonStyles.logo}
        />
      </View>
      <View style={commonStyles.dropdown}>
        <SearchDropdown data={data} dataTitle="Room" onSelect={onSelect} />
      </View>
      <View style={commonStyles.footer}></View>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({});
