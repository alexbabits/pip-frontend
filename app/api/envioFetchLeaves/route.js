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
              _treeIndex: {_eq: "${treeIndex.toString()}"}
            }) {
              leaf
              _leafIndex
            }
          }
        `
      }),
    });

    const jsonResponse = await response.json();
    
    if (!jsonResponse.data || !jsonResponse.data.Pip_Deposit) {
      return Response.json({ success: false, error: "Failed to get valid JSON response from Indexer" }, { status: 400 });
    }

    if (jsonResponse.data.Pip_Deposit.length === 0) {
      return Response.json({ success: false, error: "No deposits found for this tree and pool" }, { status: 404 });
    }

    // Sort deposits by leaf index
    const sortedDeposits = jsonResponse.data.Pip_Deposit.sort((a, b) => 
      parseInt(a._leafIndex) - parseInt(b._leafIndex)
    );

    // Extract just the leaves
    const leaves = sortedDeposits.map(deposit => deposit.leaf);

    return Response.json({ success: true, data: { leaves } });
    
  } catch (error) {
    return Response.json({ success: false, error: "Error fetching leaves for tree." }, { status: 500 });
  }
}