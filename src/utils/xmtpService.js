import { Client } from "@xmtp/xmtp-js";

// XMTP Client initialize
export const initXMTP = async (signer) => {
  try {
    const xmtp = await Client.create(signer, { env: "dev" });
    return xmtp;
  } catch (error) {
    console.error("XMTP init error:", error);
    throw error;
  }
};

// Conversation suruvat kara
export const startConversation = async (xmtp, recipientAddress) => {
  try {
    const conversation = await xmtp.conversations.newConversation(recipientAddress);
    return conversation;
  } catch (error) {
    console.error("Conversation error:", error);
    throw error;
  }
};

// Message pathava
export const sendMessage = async (conversation, message) => {
  try {
    await conversation.send(message);
    return { status: "SUCCESS" };
  } catch (error) {
    console.error("Send message error:", error);
    return { status: "FAILED", error: error.message };
  }
};

// Messages fetch kara
export const getMessages = async (conversation) => {
  try {
    const messages = await conversation.messages();
    return messages;
  } catch (error) {
    console.error("Get messages error:", error);
    return [];
  }
};

// Real-time messages stream
export const streamMessages = async (conversation, callback) => {
  try {
    for await (const message of await conversation.streamMessages()) {
      callback(message);
    }
  } catch (error) {
    console.error("Stream error:", error);
  }
};