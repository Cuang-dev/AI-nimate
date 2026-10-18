import asyncio
import json
import os
import sys

sys.path.insert(0, '/home/agent/.local/share/uv/tools/colab-mcp/lib/python3.14/site-packages')

from fastmcp import Client
from colab_mcp.websocket_server import ColabWebSocketServer
from colab_mcp.session import ColabTransport

async def execute_code(client, code: str):
    print(f"📦 Step 1: Querying existing notebook cells...")
    cells_res = await client.call_tool("get_cells", {})
    print(f"Existing cells:\n{cells_res}")
    
    print(f"\n➕ Step 2: Adding code cell at index 0...")
    add_res = await client.call_tool("add_code_cell", {"cellIndex": 0, "language": "python"})
    print(f"add_code_cell output: {add_res}")
    
    # Extract cell ID from TextContent or structured content
    cell_id = None
    if hasattr(add_res, "content"):
        for c in add_res.content:
            if hasattr(c, "text"):
                cell_id = c.text.strip().strip('"')
    if not cell_id:
        cell_id = str(add_res)
        
    print(f"Target Cell ID: {cell_id}")
    
    print(f"\n📝 Step 3: Updating cell {cell_id} with payload:\n{code}")
    update_res = await client.call_tool("update_cell", {"cellId": cell_id, "content": code})
    print(f"update_cell result: {update_res}")
    
    print(f"\n⚡ Step 4: Executing code cell in Colab kernel...")
    run_res = await client.call_tool("run_code_cell", {"cellId": cell_id})
    print(f"\n=======================================================")
    print(f"🎉 EXECUTION OUTPUT:")
    print(f"=======================================================")
    if hasattr(run_res, "content"):
        for c in run_res.content:
            if hasattr(c, "text"):
                print(c.text)
    else:
        print(run_res)
    print(f"=======================================================\n")
    return run_res

async def main():
    port = int(os.environ.get("COLAB_MCP_PORT", 50301))
    token = os.environ.get("COLAB_MCP_TOKEN", "colab-bridge-2026")
    authuser = os.environ.get("COLAB_AUTHUSER", "1")
    
    wss = ColabWebSocketServer(host="0.0.0.0")
    wss.token = token
    wss.port = port
    
    url = f"https://colab.research.google.com/notebooks/empty.ipynb?authuser={authuser}#mcpProxyToken={token}&mcpProxyPort={port}"
    print(f"📡 WebSocket server listening on ws://0.0.0.0:{port}")
    print(f"👉 Colab Bridge URL: {url}")
    print("⏳ Waiting for Colab browser to connect...")
    
    code_to_run = sys.argv[1] if len(sys.argv) > 1 else "!nvidia-smi"
    
    async with wss:
        await wss.connection_live.wait()
        print("🎉 Colab browser CONNECTED!")
        
        async with Client(ColabTransport(wss)) as client:
            print("🔍 Discovering tools and schemas...")
            tools = await client.list_tools()
            for t in tools:
                print(f"\nTool: {t.name}")
                print(f"  Description: {t.description}")
                print(f"  Schema: {json.dumps(t.parameters, indent=2)}")
                
            await execute_code(client, code_to_run)

if __name__ == "__main__":
    asyncio.run(main())
