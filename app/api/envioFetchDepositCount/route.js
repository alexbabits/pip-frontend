export async function POST(request) {

    try {
      const { treeIndex, poolAddress } = await request.json();
  
      const envioID = process.env.ENVIO_ID;
      
      const response = await fetch(`https://indexer.dev.hyperindex.xyz/${envioID}/v1/graphql`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          query: `
            query {
              Pip_Deposit(where: {
                id: {_regex: "^${poolAddress}"},
                _treeIndex: {_eq: "${treeIndex}"}
              }) {
                id
              }
            }
          `
        }),
      });
  
      const jsonResponse = await response.json();
      
      if (!jsonResponse.data || !jsonResponse.data.Pip_Deposit === undefined) {
        return Response.json({ 
          success: false, 
          error: "Failed to get valid JSON response from Indexer for deposit count" 
        }, { status: 400 });
      }
  
      const depositCount = jsonResponse.data.Pip_Deposit.length;
  
      return Response.json({ 
        success: true, 
        data: { depositCount }
      });
      
    } catch (error) {
      return Response.json({ success: false, error: "Error fetching deposit count data" }, { status: 500 });
    }
}