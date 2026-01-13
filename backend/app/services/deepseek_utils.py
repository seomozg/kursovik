"""
Универсальный модуль для взаимодействия с DeepSeek API
Автономная функция для получения ответов от DeepSeek
"""

import requests
import json
from typing import Optional, Union, Iterator
import json


def get_deepseek_response(
    prompt: str,
    api_key: str,
    model: str = "deepseek-chat",
    max_tokens: int = 1000,
    temperature: float = 0.1,
    stream: bool = False
) -> Union[str, Iterator[str]]:
    """
    Получить ответ от DeepSeek API

    Args:
        prompt: Текст запроса
        api_key: API ключ DeepSeek
        model: Название модели (по умолчанию "deepseek-chat")
        max_tokens: Максимальное количество токенов в ответе
        temperature: Температура генерации (0.0 - 1.0)
        stream: Использовать потоковую генерацию

    Returns:
        Для stream=False: строка с полным ответом
        Для stream=True: генератор, возвращающий части ответа
    """
    try:
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }

        request_data = {
            "model": model,
            "messages": [{"role": "user", "content": prompt}],
            "max_tokens": max_tokens,
            "temperature": temperature
        }

        if stream:
            request_data["stream"] = True

        response = requests.post(
            "https://api.deepseek.com/v1/chat/completions",
            headers=headers,
            json=request_data,
            timeout=60,
            stream=stream
        )

        if response.status_code == 200:
            if stream:
                # Возвращаем генератор для потоковой обработки
                return _process_stream_response(response)
            else:
                result = response.json()
                return result["choices"][0]["message"]["content"].strip()
        else:
            error_msg = f"Ошибка API DeepSeek: {response.status_code} - {response.text}"
            print(f"DEBUG: DeepSeek API error: {error_msg}")
            if stream:
                # Для потокового режима возвращаем генератор с ошибкой
                def error_generator():
                    yield error_msg
                return error_generator()
            else:
                return error_msg

    except Exception as e:
        error_msg = f"Ошибка при запросе к DeepSeek: {str(e)}"
        if stream:
            def error_generator():
                yield error_msg
            return error_generator()
        else:
            return error_msg


def _process_stream_response(response: requests.Response) -> Iterator[str]:
    """
    Обработать потоковый ответ от DeepSeek API

    Args:
        response: Объект ответа requests

    Yields:
        Части ответа по мере их получения
    """
    full_response = ""
    try:
        for line in response.iter_lines():
            if line:
                line = line.decode('utf-8')
                if line.startswith('data: '):
                    data = line[6:]
                    if data == '[DONE]':
                        break
                    try:
                        chunk = json.loads(data)
                        if 'choices' in chunk and len(chunk['choices']) > 0:
                            delta = chunk['choices'][0].get('delta', {})
                            content = delta.get('content', '')
                            if content:
                                full_response += content
                                yield content
                    except json.JSONDecodeError:
                        continue
    except Exception as e:
        yield f"Ошибка при обработке потока: {str(e)}"


# Пример использования:
if __name__ == "__main__":
    import os

    # Получаем API ключ из переменной окружения или из .env файла
    api_key = os.getenv("DEEPSEEK_API_KEY")

    if not api_key:
        # Пробуем прочитать из .env файла
        try:
            with open('.env', 'r', encoding='utf-8') as f:
                for line in f:
                    if line.startswith('DEEPSEEK_API_KEY='):
                        api_key = line.split('=', 1)[1].strip()
                        break
        except FileNotFoundError:
            pass

    if not api_key:
        print("Установите DEEPSEEK_API_KEY в переменную окружения или в .env файл")
        exit(1)

    prompt = "Расскажи о Python в двух словах"

    print("Тестирование обычного ответа...")
    # Обычный ответ
    response = get_deepseek_response(prompt, api_key)
    print("Обычный ответ:")
    print(response)

    print("\nТестирование потокового ответа...")
    # Потоковый ответ
    print("Потоковый ответ:")
    for chunk in get_deepseek_response(prompt, api_key, stream=True):
        print(chunk, end="", flush=True)
    print("\nТест завершен!")
