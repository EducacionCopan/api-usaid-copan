/**
 * Archivo para definir metodos de acceso a la base de datos de MongoDB
 * Para manipular los registros de la coleccion de Noticias
 *
 * Autor: USAID - Proyecto Avanzando por la Salud de Honduras
 * Fecha: Junio 2023
 * Versión: 1.0.0
 */
import Noticia from "../models/noticia.js";
import { throwInvalidIDError, throwNotFoundException } from "../utilities/errorHandler.js";
import { crearArchivos, eliminarArchivo, publicarArchivo } from "./archivos-controller.js";
import { getDepartamentoById } from "./departamentos-controller.js";

/**
 * Registra la base de dato y obtiene una lista de noticias, 
 * ordenadas de la mas reciente a la mas antigua y
 * definiendo un limite de entradas por peticion
 * @returns Un arreglo de noticias cumpliendo con los filtros establecidos
 */
export async function getNoticias(index = 1, idDepartamento = undefined){
  const queryFilter = idDepartamento ? {departamento: {_id: idDepartamento}} : {};
  return Noticia.find(queryFilter).sort({ _id: -1 }).skip((index-1)*5).limit(5).populate("departamento").populate("archivos");
}


export async function getNoticiaById(idNoticia){
  return Noticia.findById(idNoticia).populate("departamento").populate("archivos").catch((error) => throwInvalidIDError("Noticia", error.message));
}


/**
 * Registra la base de dato y obtiene una lista de noticias, 
 * ordenadas de la mas reciente a la mas antigua y
 * definiendo un limite de entradas por peticion
 * @returns Un arreglo de noticias cumpliendo con los filtros establecidos
 */
export async function getCountNoticias(){
  return Noticia.countDocuments();
}


/**
 * Crea una nueva noticia con datos ingresados por el usuario, y la guarda en MongoDB
 * @returns 
 */
export async function addNoticia({deptoId, contenido, stringArchivos}){
  //Se obtiene el objeto con la informacion sobre el departamento vinculado a la noticia a crear
  const departamento = await getDepartamentoById(deptoId);
  if(!departamento) return throwNotFoundException("Departamento");

  const archivos = JSON.parse(stringArchivos).map(
    async archivo => await publicarArchivo(archivo)
  )

  const noticia = new Noticia({
    departamento, 
    contenido,
    //Se define el momento actual para la creacion de la noticia
    fechaPublicacion: Date.now(),
    //Se guarda el arreglo de archivos adjuntos a la noticia
    archivos: archivos
  });

  //Se obtiene el objeto guardado en la base de datos ya con su ID y se devuelve al final de la funcion
  const saved = (await noticia.save());
  return saved;
}


export async function addNoticiaPC({deptoId, contenido, files}){
  //Se obtiene el objeto con la informacion sobre el departamento vinculado a la noticia a crear
  const departamento = await getDepartamentoById(deptoId);
  if(!departamento) return throwNotFoundException("Departamento");

  const archivos = await crearArchivos(files);

  const noticia = new Noticia({
    departamento, 
    contenido,
    //Se define el momento actual para la creacion de la noticia
    fechaPublicacion: Date.now(),
    //Se guarda el arreglo de archivos adjuntos a la noticia
    archivos: archivos
  });

  return noticia.save();
}


export async function modificarNoticia(idNoticia, contenido=null){
  const noticia = await getNoticiaById(idNoticia);
  if(!noticia) return throwNotFoundException("Noticia");

  if(contenido) noticia.contenido = contenido;

  return noticia.save();
}


export async function eliminarNoticia(idNoticia){
  const noticia = await getNoticiaById(idNoticia);
  if(!noticia) return throwNotFoundException("Noticia");

  noticia.archivos.forEach( async (archivo) => {
    await eliminarArchivo(archivo._id);
  });

  return noticia.delete();
}
