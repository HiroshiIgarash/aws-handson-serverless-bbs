import { useEffect, useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE;

type Message = {
  id: string;
  name: string;
  content: string;
};

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [name, setName] = useState("");
  const [content, setContent] = useState("");

  const fetchMessages = async () => {
    const res = await fetch(API_BASE);
    const data = await res.json();
    setMessages(data);
  };

  const postMessage = async () => {
    await fetch(API_BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, content }),
    });
    setContent("");
    fetchMessages();
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  return (
    <div className="max-w-xl mx-auto mt-10">
      <h1 className="text-2xl font-bold mb-4">掲示板</h1>
      <div className="mb-4">
        <input
          type="text"
          placeholder="名前"
          className="border p-2 mr-2"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          type="text"
          placeholder="内容"
          className="border p-2 mr-2"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        <button
          onClick={postMessage}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          投稿
        </button>
      </div>
      <ul className="space-y-2">
        {messages.map((msg) => (
          <li key={msg.id} className="border p-2 rounded">
            <strong>{msg.name}:</strong> {msg.content}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;
