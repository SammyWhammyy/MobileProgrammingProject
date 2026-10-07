import { StyleSheet } from "react-native";

const commonStyles = StyleSheet.create({
  header: {
    position: "absolute",
    top: 0,
    backgroundColor: "#d7afff",
    width: "100%",
    height: 70,
    display: "flex",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  footer: {
    position: "absolute",
    bottom: 0,
    backgroundColor: "#21759b",
    width: "100%",
    height: 75,
  },
  container: {
    flex: 1,
    backgroundColor: "#eff9f1",
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: 200,
    height: 50,
    objectFit: "contain",
    marginBottom: 5,
  },
  dropdown: {
    width: "40%",
    marginTop: 100,
  },
});
export default commonStyles;
