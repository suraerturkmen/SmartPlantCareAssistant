# Import package
import paho.mqtt.client as mqtt
import time
import board
import adafruit_dht
import json

# Sensor data pin is connected to GPIO 4
# Uncomment for DHT11


# Define Variables
MQTT_HOST = "192.168.1.25"
MQTT_PORT = 1883
MQTT_KEEPALIVE_INTERVAL = 5
MQTT_TOPIC = "hello/world"

# Define on_connect event Handler
def on_connect(mosq, obj, rc):
    print("Connected to MQTT Broker")

# Define on_publish event Handler
def on_publish(client, userdata, mid):
    print("Message Published...")

# Initiate MQTT Client
mqttc = mqtt.Client()

# Register Event Handlers
mqttc.on_publish = on_publish
mqttc.on_connect = on_connect

# Connect with MQTT Broker
mqttc.connect(MQTT_HOST, MQTT_PORT, MQTT_KEEPALIVE_INTERVAL)

sensor = adafruit_dht.DHT11(board.D4)

while True:
    try:
        # Print the values to the serial port
        temperature_c = sensor.temperature
        humidity = sensor.humidity
        
        data = {
            "temperature": temperature_c,
            "humidity": humidity
        }
        
        MQTT_MSG = json.dumps(data)
        mqttc.publish(MQTT_TOPIC, MQTT_MSG)
 
    except RuntimeError as error:
        # Errors happen fairly often, DHT's are hard to read, just keep going
        print(error.args[0])
        time.sleep(2.0)
        continue
    except Exception as error:
        mqttc.disconnect()
        sensor.exit()
        raise error

    time.sleep(3.0)
