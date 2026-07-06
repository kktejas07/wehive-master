import os
import asyncio
from dotenv import load_dotenv

load_dotenv()
from ai_marketplace import marketplace, get_fallback_providers

async def main():
    pool = get_fallback_providers()
    print("Fallback Pool size:", len(pool))
    for provider, pid in pool:
        print(" -", pid, provider.model)

    try:
        reply = await marketplace.chat("test_user", "You are a helpful assistant.", "Say 'Hello World' and tell me which model you are using.")
        print("\nResponse:", reply)
    except Exception as e:
        print("\nError:", e)

if __name__ == "__main__":
    asyncio.run(main())
