import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { StyleSheet, Text, View, PermissionsAndroid, TouchableOpacity, Button } from 'react-native';
import { BleManager, Characteristic, Device, Service } from 'react-native-ble-plx';
import NfcManager, {NfcTech, TagEvent} from 'react-native-nfc-manager';
import { Buffer } from 'buffer';


export default function App() {

  let manager: any = null;
  useEffect(() => {
    // PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION)
    //   .then(() => console.log('got ACCESS_FINE_LOCATION permissions'));
    // PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.BLUETOOTH)
    //   .then(() => console.log('got BLUETOOTH permissions'));

    manager = new BleManager();
    NfcManager.start();
    return () => {
      manager.destroy()
    };
  }, []);

  React.useEffect(() => {
    if(manager) {
      const subscription = manager.onStateChange((state: string) => {
        if (state === 'PoweredOn') {
            subscription.remove();
        }
    }, true);
      return () => {
        subscription.remove();
      }
    } 
  }, [manager]);

  async function readNdef() {
    try {
      // register for the NFC tag with NDEF in it
      await NfcManager.requestTechnology(NfcTech.Ndef);
      // the resolved tag object will contain `ndefMessage` property
      const tag: TagEvent | null = await NfcManager.getTag();
      if(tag) {
        manager.connectToDevice(Buffer.from(tag.ndefMessage[1].payload).toString("utf8").slice(3, 20).toUpperCase())
        .then((connectedDevice: Device) => {
          console.log('discoving services: ', connectedDevice.name)
            return connectedDevice.discoverAllServicesAndCharacteristics()
        })
        .then((discoveredDevice: Device) => {
          console.log('device connected: ', discoveredDevice.name)
          discoveredDevice.services().then((services: Service[]) => {
            console.log(services.map((service) => service.uuid))
            discoveredDevice.readCharacteristicForService("EF680100-9B35-4933-9B10-52FFA9740042", "EF680101-9B35-4933-9B10-52FFA9740042")
              .then((characteristic: Characteristic) => {
                if(characteristic && characteristic.value) {
                  console.log('got characteristic: ', Buffer.from(characteristic.value).toString("utf8"))
                }
                
              })
          });
          
        })
        .catch((error: any) => {
            console.log('connection error', error)
        });       
      }
      

    } catch (ex) {
      console.warn('error: ', ex);
    } finally {
      // stop the nfc scanning
      NfcManager.cancelTechnologyRequest();
    }
  }

  // function readTextRecord(record) {
  //   console.assert(record.recordType === "text");
  //   const textDecoder = new TextDecoder(record.encoding);
  //   console.log(`Text: ${textDecoder.decode(record.data)} (${record.lang})`);
  // }

  const scanAndConnect = () => {
    console.log('starting scan')
    manager.startDeviceScan(null, null, (error: object, device: Device) => {
        if (error) {
            console.log('scan error: ', error)
            return
        }

        console.log('found device: ', device.name, device.id)
        if (device.name === 'Thingy') {
            
            manager.stopDeviceScan();
            console.log('stopped scanning, found Thingy')

            device.connect()
              .then((connectedDevice: Device) => {
                console.log('discoving services: ', connectedDevice.name)
                  return connectedDevice.discoverAllServicesAndCharacteristics()
              })
              .then((discoveredDevice: Device) => {
                console.log('device connected: ', discoveredDevice.name)
                device.services().then((services: Service[]) => {
                  console.log(services.map((service) => service.uuid))
                  
                });
                
              })
              .catch((error) => {
                  console.log('connection error', error)
              });
            
        }
    });
  }

  return (
    <View style={styles.container}>
      <Text>Open up App.js to start working on your app! </Text>
      <StatusBar style="auto" />
      <Button title="scan and connect" onPress={scanAndConnect}/>
      <Text>or</Text>
      <Button onPress={readNdef} title="Scan a Tag" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
