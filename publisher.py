import paho.mqtt.client as mqtt
import time
import board
import adafruit_dht
import json
import RPi.GPIO as GPIO

# Define Variables
MQTT_HOST = "192.168.1.2"
MQTT_PORT = 1883
MQTT_KEEPALIVE_INTERVAL = 60
MQTT_TOPIC = "message"
MQTT_WATER_TOPIC = 'home/garden/water'

# Initialize MQTT Client
mqttc = mqtt.Client()

# Define on_connect event Handler
def on_connect(self,mosq, obj, rc):
    print("Connected to MQTT Broker")
    mqttc.subscribe(MQTT_WATER_TOPIC)

# Define on_publish event Handler
def on_publish(client, userdata, mid):
    print("Message Published...")

# Define on_message event Handler
def on_message(client, userdata, msg):
    #if msg.topic == MQTT_WATER_TOPIC:
    print(msg)
    message = msg.payload.decode()
    print("message:",message)
    print("Watering command received")
    #GPIO.output(17, GPIO.HIGH)
    time.sleep(1)
    #GPIO.output(17, GPIO.LOW)
    print("Watering done")

# Register Event Handlers
mqttc.on_publish = on_publish
mqttc.on_connect = on_connect
mqttc.on_message = on_message

# Connect with MQTT Broker
mqttc.connect(MQTT_HOST, MQTT_PORT, 60)

# Initialize DHT11 sensor
sensor = adafruit_dht.DHT11(board.D4)

# Initialize GPIO for soil moisture sensor
channel = 21
GPIO.setmode(GPIO.BCM)
GPIO.setup(channel, GPIO.IN)
#GPIO.setup(17, GPIO.OUT)  # Set up GPIO 17 as an output

water = False
# Callback function for soil moisture sensor
def callback(channel):
    global water
    if GPIO.input(channel):
        print("Water Detected!")
        water = True
    else:
        print("No Water Detected!")
        water = False

# Set up event detection for soil moisture sensor
GPIO.add_event_detect(channel, GPIO.BOTH, bouncetime=300)
GPIO.add_event_callback(channel, callback)

# Start MQTT loop
mqttc.loop_start()

while True:
    try:
        # Read temperature and humidity from DHT11 sensor
        temperature_c = sensor.temperature
        humidity = sensor.humidity
        
        # Convert temperature to Fahrenheit
        temperature_f = temperature_c * (9 / 5) + 32

        # Create JSON payload
        data = {
            "isWater": water,
            "humidity": humidity,
            "temperature": temperature_c
        }

        # Convert payload to JSON string
        MQTT_MSG = json.dumps(data)

        # Publish MQTT message
        mqttc.publish(MQTT_TOPIC, MQTT_MSG)

    except RuntimeError as error:
        print("DHT11 sensor error:", error)
        time.sleep(2.0)
        continue

    except Exception as error:
        print("An error occurred:", error)
        mqttc.disconnect()
        raise error

    time.sleep(3.0)
