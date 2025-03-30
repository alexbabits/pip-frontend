export async function POST(request) {

  try {

    const { treeIndex, poolAddress } = await request.json();
    const envioID = process.env.ENVIO_ID;
    const LIMIT = 1000; // 1000 in prod
    let allWithdraws = [];
    let hasMore = true;
    let offset = 0;
    
    while (hasMore) {

      const response = await fetch(`https://indexer.dev.hyperindex.xyz/${envioID}/v1/graphql`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          query: `
            query {
              Pip_Withdraw(
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
      
      if (!jsonResponse.data || jsonResponse.data.Pip_Withdraw === undefined) {
        return Response.json({ 
          success: false, 
          error: "Failed to get valid JSON response from Indexer for withdraw count" 
        }, { status: 400 });
      }

      const withdraws = jsonResponse.data.Pip_Withdraw;
      allWithdraws.push(...withdraws);
      
      hasMore = withdraws.length === LIMIT;
      offset += LIMIT;
      
      if (offset > LIMIT * 10) {
        console.log("Something went horribly wrong with fetch withdraw count pagination.");
        break;
      }
    }

    const withdrawCount = allWithdraws.length;

    return Response.json({ 
      success: true, 
      data: { withdrawCount }
    });
    
  } catch (error) {
    console.error("Error fetching withdraw count:", error);
    return Response.json({ success: false, error: "Error fetching withdraw count data" }, { status: 500 });
  }
}