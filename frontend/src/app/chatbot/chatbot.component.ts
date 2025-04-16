import { Component, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-chatbot',
  templateUrl: './chatbot.component.html',
  styleUrls: ['./chatbot.component.css'],
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [CommonModule],
})
export class ChatbotComponent {
  isOpen = false;

  toggleChatbot() {
    this.isOpen = !this.isOpen;
    console.log('Tıklandı, isOpen:', this.isOpen);

    if (this.isOpen) {
      setTimeout(() => this.setupChatEvents(), 0);
    }
  }

  private setupChatEvents() {
    const input = document.getElementById('user-input') as HTMLInputElement | null;
    const sendBtn = document.getElementById('send-btn');
    const chatBox = document.getElementById('chat-box')!;

    if (!input || !sendBtn || !chatBox) return;

    input.focus();

    const sendMessage = async () => {
      const message = input.value.trim();
      if (!message) return;

      // Kullanıcı mesajı kutusu
      const userMessage = document.createElement('div');
      userMessage.className = 'chat-message user';
      userMessage.textContent = message;
      chatBox.appendChild(userMessage);

      // Boş bot kutusu (chunk'lar buraya yazılacak)
      const botMessage = document.createElement('div');
      botMessage.className = 'chat-message bot';
      chatBox.appendChild(botMessage);

      chatBox.scrollTop = chatBox.scrollHeight;
      input.value = '';

      const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message }),
        });

        const reader = response.body!.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.trim().startsWith('data: ')) {
              const content = line.slice(6);
              if (content.trim() === '{"done":true}') continue;

              await sleep(30);
              botMessage.innerHTML += content;
            }
          }
        }
      } catch (err) {
        botMessage.textContent = 'Bir hata oluştu.';
        console.error('Sohbet hatası:', err);
      }

      chatBox.scrollTop = chatBox.scrollHeight;
    };

    // Enter'a basıldığında mesaj gönder
    input.onkeydown = (e) => {
      if ((e as KeyboardEvent).key === 'Enter') sendMessage();
    };

    // Butona basıldığında mesaj gönder
    sendBtn.addEventListener('click', () => sendMessage());
  }
}
