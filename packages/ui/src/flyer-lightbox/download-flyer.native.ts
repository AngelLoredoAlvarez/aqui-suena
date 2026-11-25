import { flyerDownloadName } from "@aqui-suena/ui/flyer-lightbox/download-name";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { Linking } from "react-native";

export async function downloadFlyer(imageUrl: string, name: string): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) {
    await Linking.openURL(imageUrl);

    return;
  }

  const destination = new File(Paths.cache, flyerDownloadName(name, imageUrl));

  if (destination.exists) {
    destination.delete();
  }

  const file = await File.downloadFileAsync(imageUrl, destination);

  await Sharing.shareAsync(file.uri);
}
