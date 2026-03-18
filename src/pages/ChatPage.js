import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { ref, push, onValue, serverTimestamp } from "firebase/database";
import { db } from "../firebase";
import { useWallet } from "../WalletContext";
import { storeNotification } from "../utils/notificationService";
import "./ChatPage.css";

const ChatPage = () => {
  const { walletAddress } = useWallet();
  const location = useLocation();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [recipientAddress, setRecipientAddress] = useState(location.state?.recipientAddress || location.state?.senderAddress || "");
  const selectedJob = location.state || {};
  const [chatStarted, setChatStarted] = useState(false);
  const [chatId, setChatId] = useState("");
  const [error, setError] = useState("");
  const messagesEndRef = useRef(null);

  // Notification permission maag
  useEffect(() => {
    if ("Notification" in window) {
      Notification.requestPermission().then(permission => {
        console.log("Notification permission:", permission);
      });
    }
  }, []);

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-open logic from Notification or Navigation
  useEffect(() => {
    const state = location.state;
    if (state?.recipientAddress || state?.senderAddress) {
      const addr = state.recipientAddress || state.senderAddress;
      setRecipientAddress(addr);

      if (addr && walletAddress) {
        const addresses = [walletAddress, addr].sort();
        setChatId(`${addresses[0]}_${addresses[1]}`);
        setChatStarted(true);
      }
    }
  }, [location.state, walletAddress]);

  // Messages fetch kara Firebase madhun
  useEffect(() => {
    if (!chatId) return;

    const messagesRef = ref(db, `chats/${chatId}/messages`);
    const unsubscribe = onValue(messagesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const messageList = Object.values(data);
        messageList.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

        // ✅ Notification
        const lastMsg = messageList[messageList.length - 1];
        if (
          lastMsg &&
          lastMsg.senderAddress !== walletAddress &&
          Notification.permission === "granted"
        ) {
          new Notification("💬 FreelanceChain Chat", {
            body: `${lastMsg.senderShort || "Someone"}: ${lastMsg.content}`,
            icon: "/favicon.ico",
          });
        }

        setMessages(messageList);
      } else {
        setMessages([]);
      }
    });

    return () => unsubscribe();
  }, [chatId, walletAddress]);

  // Chat suruvat kara
  const handleStartChat = () => {
    if (!recipientAddress.startsWith("G") || recipientAddress.length < 10) {
      setError("Valid Stellar wallet address ghala (G... ne suruvat)");
      return;
    }
    setError("");

    // Unique chat ID banva — dono addresses sort karun
    const addresses = [walletAddress, recipientAddress].sort();
    const id = `${addresses[0]}_${addresses[1]}`;
    setChatId(id);
    setChatStarted(true);
  };

  // Message pathava
  const handleSend = async () => {
    if (!newMessage.trim()) return;

    try {
      const messagesRef = ref(db, `chats/${chatId}/messages`);
      const senderShort = walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : "User";

      await push(messagesRef, {
        content: newMessage.trim(),
        senderAddress: walletAddress,
        senderShort: senderShort,
        timestamp: serverTimestamp(),
      });

      // ✅ Recipient la notification pathava
      if (recipientAddress) {
        await storeNotification(
          recipientAddress,
          walletAddress,
          newMessage.trim(),
          selectedJob.title,
          selectedJob.id
        );
      }

      setNewMessage("");
    } catch (err) {
      setError("Message send failed: " + err.message);
    }
  };

  return (
    <div className="chat-container">
      <h2>💬 FreelanceChain Chat</h2>

      {!chatStarted ? (
        <div className="chat-connect">
          <p>Direct encrypted chat between Client and Freelancer!</p>
          <p style={{ fontSize: "0.85rem", opacity: 0.6, marginBottom: "16px" }}>
            Your address: {walletAddress?.slice(0, 8)}...{walletAddress?.slice(-4)}
          </p>
          <input
            type="text"
            placeholder="Freelancer/Client Wallet Address (G...)"
            value={recipientAddress}
            onChange={(e) => setRecipientAddress(e.target.value)}
            style={{
              width: "100%",
              maxWidth: "460px",
              padding: "14px 18px",
              borderRadius: "12px",
              border: "1px solid rgba(99,102,241,0.4)",
              background: "rgba(99,102,241,0.1)",
              color: "white",
              fontSize: "14px",
              outline: "none",
              textAlign: "center",
              letterSpacing: "0.3px",
              backdropFilter: "blur(10px)",
              boxShadow: "0 4px 20px rgba(99,102,241,0.2)",
              marginBottom: "8px",
            }}
          />
          <button onClick={handleStartChat}>
            💬 Start Chat
          </button>
          {error && <p className="chat-error">❌ {error}</p>}
        </div>
      ) : (
        <div className="chat-window">
          <div className="chat-header">
            <p>💬 {recipientAddress.slice(0, 8)}...{recipientAddress.slice(-4)}</p>
            <button
              onClick={() => { setChatStarted(false); setMessages([]); }}
              style={{
                background: "transparent",
                border: "1px solid rgba(255,255,255,0.3)",
                color: "white",
                padding: "4px 10px",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "12px"
              }}
            >
              ← Back
            </button>
          </div>

          <div className="chat-messages">
            {messages.length === 0 ? (
              <p className="no-messages">Pehla message pathava! 👋</p>
            ) : (
              messages.map((msg, index) => (
                <div
                  key={index}
                  className={`message ${msg.senderAddress === walletAddress ? "sent" : "received"}`}
                >
                  <p>{msg.content}</p>
                  <span className="time">
                    {msg.timestamp
                      ? new Date(msg.timestamp).toLocaleTimeString()
                      : "..."}
                  </span>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="chat-input">
            <input
              type="text"
              placeholder="Message lihа..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSend()}
            />
            <button onClick={handleSend}>Send 📤</button>
          </div>

          {error && <p className="chat-error">❌ {error}</p>}
        </div>
      )}
    </div>
  );
};

export default ChatPage;