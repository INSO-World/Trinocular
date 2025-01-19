// TODO: Create function to be used in route to load the visualization data from the database
export async function loadDemoChartDataFromDatabase(req, res) {
  // TODO: 1. Get the pipeline data from the database
  const uuid = req.query.repo;
  // const demoData = await getDemoData(uuid);

  // TODO: Remove
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 10);

  const demoData = Array.from({ length: 10 }, (_, i) => ({
    date: new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + i).toISOString().split('T')[0],
    value: i * 10
  }));

  // TODO: 2. Manipulate the data to be in the format required by the frontend if needed


  res.json(demoData);
}
