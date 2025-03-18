export async function POST(request) {

    try {
      const { leaf, poolAddress } = await request.json();

      const envioID = process.env.ENVIO_ID;
      
      const response = await fetch(`https://indexer.dev.hyperindex.xyz/${envioID}/v1/graphql`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          query: `
            query {
              Pip_Deposit(where: {
                id: {_regex: "^${poolAddress}"},
                leaf: {_eq: "${leaf}"}
              }) {
                _leafIndex
                _treeIndex  
              }
            }
          `
        }),
      });
  
      const jsonResponse = await response.json();
      
      if (!jsonResponse.data || !jsonResponse.data.Pip_Deposit) {
        return Response.json({ 
            success: false, 
            error: "Failed to get valid JSON response from Indexer" 
        }, { status: 400 });
      }
  
      if (jsonResponse.data.Pip_Deposit.length === 0) {
        return Response.json({ 
            success: false, 
            error: "Indexer failed to find any Deposit events containing the leaf value associated with your nullifier" 
        }, { status: 404 });
      }
  
      const deposit = jsonResponse.data.Pip_Deposit[0];
      return Response.json({ success: true, data: { leafIndex: deposit._leafIndex, treeIndex: deposit._treeIndex }});
      
    } catch (error) {
      return Response.json({ success: false, error: "Error fetching indices for leaf." }, { status: 500 });
    }
  }