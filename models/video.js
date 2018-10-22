const mongoose = require('mongoose');
const Schema = mongoose.Schema;

let VideoSchema = new Schema({
    usuario: {
        type: String,
        required: true
    },
    nombres: {
        type: String,
        required: true
    },
    apellidos: {
        type: String,
        required: true
    },
    concurso: {
        type: String,
        required: true
    },
    ruta: {
        type: String,
        required: true
    },
    descripcion: {
        type: String,
        required: true
    },
    originalName: {
        type: String,
        required: true
    },
    estado: {
        type: String,
        required: true
    },
    createdDate:{
        type:Date,
        require:true
    }
});

module.exports = mongoose.model('Video', VideoSchema);