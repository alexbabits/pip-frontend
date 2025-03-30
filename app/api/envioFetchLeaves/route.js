export async function POST(request) {

  try {

    const { treeIndex, poolAddress } = await request.json();
    const envioID = process.env.ENVIO_ID;
    const LIMIT = 1000; // 1000 in prod
    let allDeposits = [];
    let hasMore = true;
    let offset = 0;

    while (hasMore) {

      const response = await fetch(`https://indexer.dev.hyperindex.xyz/${envioID}/v1/graphql`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          query: `
            query {
              Pip_Deposit(
                where: {
                  id: {_regex: "^${poolAddress}"},
                  _treeIndex: {_eq: "${treeIndex.toString()}"}
                },
                limit: ${LIMIT},
                offset: ${offset}
              ) {
                leaf
                _leafIndex
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

      const deposits = jsonResponse.data.Pip_Deposit;
      allDeposits.push(...deposits);
      
      hasMore = deposits.length === LIMIT;
      offset += LIMIT;

      if (offset > LIMIT * 10) {
        console.log("Something went horribly wrong with fetch leaves pagination.");
        break;
      }

    }

    if (allDeposits.length === 0) {
      return Response.json({ 
        success: false, 
        error: "No deposits found for this tree and pool" 
      }, { status: 404 });
    }

    // Sort deposits by leaf index
    const sortedDeposits = allDeposits.sort((a, b) => 
      parseInt(a._leafIndex) - parseInt(b._leafIndex)
    );

    // Extract just the leaves
    const leaves = sortedDeposits.map(deposit => deposit.leaf);

    return Response.json({ success: true, data: { leaves } });
    
  } catch (error) {
    return Response.json({ success: false, error: "Error fetching leaves for tree." }, { status: 500 });
  }
}