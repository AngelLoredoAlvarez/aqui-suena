import { greeting } from "@aqui/ui";
import { Text, View } from "react-native";

export default function Index() {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <Text>Aqui Suena</Text>
      <Text>{greeting()}</Text>
    </View>
  );
}
