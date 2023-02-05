import { useRef, useState } from "react";

import { Bagman } from "bagman";


function App() {

  const [channel, setChannel] = useState("");
  const [event, setEvent] = useState("");
  const [data, setData] = useState("");
  const [messages, setMessages] = useState([]);

  const channelRef = useRef(null);
  const bagmanRef = useRef(null);
  function getBagman() {
    if (bagmanRef.current === null) {
      bagmanRef.current = new Bagman({ url: "http://localhost:8080/"});
    }
    return bagmanRef.current;
  }

  function onChannelChange(evt) {
    setChannel(evt.target.value);
  }

  function onEventChange(evt) {
    console.log(evt.target.value);
    setEvent(evt.target.value)
  }

  function onDataChange(evt) {
    setData(evt.target.value)
  }

  async function onSubscribe() {
    const bagman = getBagman();
    if (channel) {
      console.log('subscribing ', channel)
      channelRef.current = await bagman.subscribe(channel);
    }
  }

  async function onUnsubscribe() {
    if (channelRef.current) {
      const channel = channelRef.current;
      await channel.unsubscribe();
    }
  }
  async function onListen() {
    if (channelRef.current) {
      const channel = channelRef.current;
      console.log('listening for event ', event)
      await channel.listen(event, (message) => {
        console.log('received message', message);
        setMessages((messages) => [...messages,  message ]);
      })
    }
  }

  async function onEmit() {
    if (channelRef.current) {
      const channel = channelRef.current;
      await channel.publish(event, JSON.parse(data));
    }
  }

  return (
    <>
      <nav>
        <ul>
          <li><strong>Bagman</strong></li>
        </ul>
      </nav>
      <div className="grid">
        <label for="channel">
          Channel: 
          <input type="text" name="channel" id="channel" onChange={onChannelChange} />
        </label>
        <button onClick={onSubscribe}>Subscribe</button>
        <button onClick={onUnsubscribe}>Unsubscribe</button>
      </div>
      <div className="grid">
        <label for="event">
          Event: 
          <input type="text" name="event" id="event" onChange={onEventChange} />
        </label>
        <button onClick={onListen}>Listen</button>
      </div>
      <div className="grid">
        <label for="data">
          Data:
          <textarea style={{ resize: "vertical"}} name="data" id="data" onChange={onDataChange} />
        </label>
        <button onClick={onEmit}>Emit</button>
      </div>
      <div>
        {messages.map((message) => (
          <article>{JSON.stringify(message)}</article>
        ))}
      </div>
    </>
  );
}

export default App;
