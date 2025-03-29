export async function POST(request) {

  try {

    const { treeIndex, poolAddress } = await request.json();
    const envioID = process.env.ENVIO_ID;
    const LIMIT = 3; // 1000 in prod
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
                  _treeIndex: {_eq: "${treeIndex}"}
                }, 
                limit: ${LIMIT},
                offset: ${offset}
              ) {
                id
              }
            }
          `
        }),
      });

      const jsonResponse = await response.json();

      if (!jsonResponse.data || jsonResponse.data.Pip_Deposit === undefined) {
        return Response.json({ 
          success: false, 
          error: "Failed to get valid JSON response from Indexer for deposit count" 
        }, { status: 400 });
      }

      const deposits = jsonResponse.data.Pip_Deposit;
      allDeposits.push(...deposits);

      hasMore = deposits.length === LIMIT;
      offset += LIMIT;
      
      if (offset > LIMIT * 10) {
        console.log("Something went horribly wrong with fetch deposit count pagination.");
        break;
      }
    }

    const depositCount = allDeposits.length;

    return Response.json({ 
      success: true, 
      data: { depositCount }
    });
    
  } catch (error) {
    return Response.json({ success: false, error: "Error fetching deposit count data" }, { status: 500 });
  }
}