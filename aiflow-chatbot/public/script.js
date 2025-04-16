function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function sendMessage() {
  const input = document.getElementById("user-input");
  const chatBox = document.getElementById("chat-box");
  const message = input.value.trim();

  if (!message) return;

  const userMessage = document.createElement("div");
  userMessage.className = "chat-message user";
  userMessage.textContent = message;
  chatBox.appendChild(userMessage);

  const botMessage = document.createElement("div");
  botMessage.className = "chat-message bot";
  chatBox.appendChild(botMessage);

  chatBox.scrollTop = chatBox.scrollHeight;
  input.value = "";

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n");

      for (const line of lines) {
        if (line.trim().startsWith("data: ")) {
          let content = line.slice(6);

          if (content.trim() === '{"done":true}') continue;

          const botMessage = document.querySelector(
            ".chat-message.bot:last-of-type"
          );
          if (botMessage) {
            const formattedChunk = content;
            await sleep(30);
            botMessage.innerHTML += formattedChunk;
          }

          console.log("Chunk:", content);
        }
      }
    }
  } catch (err) {
    const botMessage = document.querySelector(".chat-message.bot:last-of-type");
    if (botMessage) {
      botMessage.textContent = "Bir hata oluştu.";
    }
    console.error("Sohbet hatası:", err);
  }

  chatBox.scrollTop = chatBox.scrollHeight;
}

document.getElementById("user-input").addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendMessage();
});

window.addEventListener("DOMContentLoaded", () => {
  document.getElementById("user-input").focus();
});
