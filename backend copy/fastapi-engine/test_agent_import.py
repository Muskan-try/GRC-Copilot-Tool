import asyncio
import os
import sys
sys.path.append(os.getcwd())
from app.modules.compliance_agent.agent import agent

async def test():
    res = await agent.run_assessment(b"test", "test.txt")
    print(res.get("status"))
    print(res.get("method"))

asyncio.run(test())
