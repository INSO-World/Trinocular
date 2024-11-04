
export async function getRepository(req, res) {
  res.sendStatus(200);
}


export async function postRepository(req, res) {

  const {uuid}= req.params;

  // validate req.body with joi
  // const members= data.memebers.map( m => new Member( m.usernam, ... ... ) )
  // const repository= new Repository(..., members, ...)
  // insertNewRepositoryAndSetDbId( repository );
  
  res.sendStatus(200);
}


