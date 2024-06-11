const texts = require("./texts");
const { Firestore } = require('@google-cloud/firestore');
const crypto = require("crypto");
const predictClassification = require("../services/inferenceService");
const storeData = require("../services/storeData");
const getData = require("../services/getData");
const { time, timeStamp } = require("console");
const db = new Firestore(); // for search & histories

async function postPredictHandler(request, h) {
  const { image } = request.payload;
  const { model } = request.server.app;
  const { label, suggestion } = await predictClassification(model, image);
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  const data = {
      id: id,
      result: label,
      suggestion: suggestion,
      createdAt: createdAt,
  };

  await storeData(id, data);
  const response = h.response({
      status: "success",
      message: "Model is predicted successfully",
      data,
  });
  response.code(201);
  return response;
}

// async function getPredictHistoriesHandler(request, h) {
//   const data = await getData("\(default\)");

//   const response = h.response({
//       status: "success",
//       data,
//   });
//   response.code(200)
//   return response;
// }

const getPredictHistoriesHandler = async (request,h) => { 
  try{
    const requestData = request.payload;
    
    if (!requestData || !Array.isArray(requestData)){
      return h.response({error :'Invalid request data'}).code(400);
    }
    const batch = db.batch();
    requestData.forEach(data => {
        const docRef = db.collection('history').doc();
        batch.set(docRef, data);
    });
    await batch.commit();
    return h.response({ message: 'History data received and saved successfully' }).code(200);
  } catch(error){
    console.error('Error handling history request:', error);
    return h.response({ error: 'Internal server error' }).code(500);
  }
};

const savetextHandler = async (request, h) => {
  const { name, url_image, url_artikel,deskripsi} = request.payload;
  const timestamp = new Date().toISOString();
  const newText = { name, url_image, url_artikel,deskripsi,timestamp };
  

  try {
    await db.collection('texts').add(newText);
    const response = h.response({
      status: "success",
      message: "Artikel Berhasil Ditambahkan",
      data: {
        textName: name,
        texturlImage: url_image,
        texturlArtikel : url_artikel,
        textDeskripsi : deskripsi,
        textTimestamp : timestamp
      },
    });
    response.code(201);
    return response;

  } catch (error) {
    const response = h.response({
      status: "fail",
      message: "Artikel gagal ditambahkan",
      error: error.message,
    });
    response.code(500);
    return response;
  }
};


const getAllTextHandler = async (request, h) => {
  try {
    const querySnapshot = await db.collection('texts').get();
    const filterText = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      filterText.push({ name: data.name, url_image: data.url_image, url_artikel: data.url_artikel,deskripsi : data.deskripsi, timestamp: data.timestamp });
    });

    return h
      .response({
        status: "success",
        data: {
          texts: filterText,
        },
      })
      .code(200);

  } catch (error) {
    console.error('Gagal Mendapatkan Dokumen!:', error);
    return h.response({
      status: 'error',
      message: 'Gagal mengambil dokumen dari Database'
    }).code(500);
  }
};

const getTextbyNameHandler = async (request, h) => {
  const { textName } = request.params;

  try {
    const querySnapshot = await db.collection('texts')
      .where('name', '==', textName)
      .get();

    if (querySnapshot.empty) {
      const response = h.response({
        status: "fail",
        message: "Artikel tidak ditemukan",
      });
      response.code(404);
      return response;
    }
    const text = querySnapshot.docs[0].data();

    return {
      status: "success",
      data: {
        text,
      },
    };
  } catch (error) {
    console.error('Error mengambil dokumen:', error);
    const response = h.response({
      status: 'error',
      message: 'Gagal dalam mendapatkan dokumen dari database'
    });
    response.code(500);
    return response;
  }
};






module.exports = {getTextbyNameHandler,getAllTextHandler,savetextHandler,getPredictHistoriesHandler,postPredictHandler}