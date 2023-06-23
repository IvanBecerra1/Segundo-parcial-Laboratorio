const express = require('express');
const app = express();

app.set('puerto', 5000);

app.get('/', (request:any, response:any)=>{
    response.send('GET - servidor NodeJS');
});

//AGREGO FILE SYSTEM
const fs = require('fs');

//AGREGO JSON
app.use(express.json());

//AGREGO JWT
const jwt = require("jsonwebtoken");

//SE ESTABLECE LA CLAVE SECRETA PARA EL TOKEN
app.set("key", "cl@ve_secreta");

app.use(express.urlencoded({extended:false}));

//AGREGO MULTER
const multer = require('multer');

//AGREGO MIME-TYPES
const mime = require('mime-types');

//AGREGO STORAGE
const storage = multer.diskStorage({

    destination: "public/fotos/",
});

const upload = multer({

    storage: storage
});

//AGREGO CORS (por default aplica a http://localhost)
const cors = require("cors");

//AGREGO MW 
app.use(cors());

//DIRECTORIO DE ARCHIVOS ESTÁTICOS
app.use(express.static("public"));


//AGREGO MYSQL y EXPRESS-MYCONNECTION
const mysql = require('mysql');
const myconn = require('express-myconnection');
const db_options = {
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '',
    database: 'productos_usuarios_node'
};

app.use(myconn(mysql, db_options, 'single'));
const ERROR_DB = "Error al conectarse a la bd";

/************************* */
/* RUTAS PARA LOS MIDDLEWARE*/
/************************* */

const verificar_jwt = express.Router();

verificar_jwt.use((request : any, response : any , next : any ) => {
    // puede venir por ambos caminos
    let token = request.headers["x-access-token"] || request.headers["authorization"];

    if (!token) {

        // envio la respuesta con el estado 401 y en formato Json
        response.status(401).send({error : "El JWT es requerido"})

        return;
    }

    if (token.startsWith("Bearer ")){
        token = token.slice(7, token.length); 
    }

    if (token){
        jwt.verify(token, app.get("key"), (error : any , decode : any) =>{

            if (error)
                return response.json({
                    exito : false,
                    mensaje : "el JWT no es valido"
                })
            else 
                response.jwt = decode;// agrego el token al objeto de la respuesta.
                next();// pasa siguiente colleable

        })
    }
})

const solo_admin = express.Router();

solo_admin.use(verificar_jwt, (request : any, response : any, next : any) =>{
    console.log("colleable: verificando si es admin");

    let usuario = response.jwt;// recupero el token con el objeto dentro de jwt 

    console.log(usuario + "......");

    if(usuario.usuario.rol == "administrador"){
        //SE INVOCA AL PRÓXIMO CALLEABLE
         next();
    }
    else{
        return response.json({
            mensaje:"NO tiene perfil de 'admin'"
        });
    }

})

const verificar_usuario = express.Router();

verificar_usuario.use((request : any, response : any, next : any)=>{
    let objetoBaseDatos = request.body; // conexion a la base de datos

    request.getConnection((error:any, conexion:any)=>{
        if (error) throw("error a conectarse a la base de datos");

        conexion.query("select * from usuarios where legajo = ? and apellido = ? ", [objetoBaseDatos.legajo, objetoBaseDatos.apellido], (err:any, rows:any)=>{
            if (error) throw("error a conectarse a la base de datos");


            if (rows.length == 1) {

                response.obj_usuario = rows[0] // Lo guardo para obtenerlo en el Login
                next(); // INVOCO AL SIGUIENTE COLLEABLE.
            }
            else {
                return response.status(401).json({
                    exito : false,
                    mensaje : "apellido o nombre incorrecto",
                    jwt : null // <==== elimino el JWT
                });
            }
        });
    });
});


/************************* */
/* RUTAS */
/************************* */

const colleable_1 = express.Router();

colleable_1.use((request : any, response : any, next : any) =>{

    console.log("paso por el colleable 1");
    next();
})

const colleable_2 = express.Router();

colleable_2.use((request : any, response : any, next : any) =>{
    console.log("paso por el colleable 2");
    next();
});

app.get("/hola", colleable_1,colleable_2, (req: any ,r : any , obj : any) =>{
    r.send("llegamos a la ruta despues de pasarp or los colleables:");
})

app.post("/login", verificar_usuario, (request:any, response:any, obj:any)=>{
    const usuarioObtenido = response.obj_usuario;    

    const payload = {
        usuario: {
            id : usuarioObtenido.id,
            apellido : usuarioObtenido.apellido,
            nombre : usuarioObtenido.nombre,
            rol : usuarioObtenido.rol
        },
        api : "producto_usuarios"
    };


    // key es la clave secreta que pusimos. 
    const token = jwt.sign (payload, app.get("key"), {
        expiresIn : "5m" // hago expirar el token en 5 miniutos
    });

    response.json({
        exito : true,
        mensaje : "JWT creado",
        jwt : token // <--- le doy los valores del token
    })
});

app.get('/verificar_token', verificar_jwt, (request:any, response:any)=>{
    
    response.json({exito:true, jwt: response.jwt});
});
app.get("/admin", solo_admin, (request : any, response : any, obj : any) =>{
    response.json(response.jwt);
});


/**RUTA PARA CREAR TOKEN: NO LO UTILIZO */
app.post("/crear_token", (request:any, response : any) =>{
    if ((request.body.usuario == "admin" || request.body.usuario == "user") && request.body.clave == "123456"){

        const payload = {
            exito : true,
            usuario : request.body.usuario,
            perfil : request.body.usuario == "admin" ? "administrador" : "usuario"
        }

        const token = jwt.sing(payload, app.get("key"), {
            expiresIn : "1d"
        } );

        response.json({
            mensaje : "JWT creado",
            jwt : token
        })
    }
    else {
        response.json({
            mensaje : "usuario no registrado",
            jwt : null
        })
    }
});


/******************************* */

/************************* */
/* RUTAS DE CRUD */
/************************* */
//LISTAR
// LISTAR
app.get("/productos_bd", verificar_jwt, (request : any, response : any, obj : any)=>{
    request.getConnection((error:any, conexion : any)=>{
        if (error)
            throw(ERROR_DB);
        
        conexion.query("select * from productos", (error:any, rows:any)=>{
            if (error)
                throw("error al realizar la consulta: ruta listar");

            // envio los objetos transformado en json
            response.send(JSON.stringify(rows));
        })
    })
})

// agregar
// el midlle ware que uso es solo admin porque es una verificacion
// en el modelo original estaba planteado con un middle ware de alta_baja
// que aun asi sigue siendo lo mismo
app.post("/productos_bd", solo_admin, upload.single("foto"), (request : any, response : any , obj : any)=>{


    let archivo = request.file;
    let tipoExtension = mime.extension(archivo.mimetype);

    let objetoRecibido = JSON.parse(request.body.obj);
    
    // criterio de negocio 
    let ubicacion : string = archivo.destination + objetoRecibido.codigo + "." + tipoExtension;

    // uso file system
    fs.renameSync(archivo.path, ubicacion)

    objetoRecibido.path = ubicacion.split("public/")[1];// elimino "public/" para que no se guarde en la db


    console.log(objetoRecibido);
    console.log(ubicacion);
    request.getConnection((error : any , conexion : any)=>{

        if (error) throw(ERROR_DB);

        /// objetoRecibido = objeto a guardar
        conexion.query("insert into productos set ?", [objetoRecibido], (err:any, rows:any)=>{

            if(err) {console.log(err); throw("Error en consulta de base de datos.");}

            response.send("Producto agregado a la bd.");
        });
    })
})


// modificar
// foto = igual al parametro que se va enviar
app.post("/productos_bd/modificar", solo_admin, upload.single("foto"), (request : any, response : any, obj : any)=>{

    let archivo = request.file;
    let tipoExtension = mime.extension(archivo.mimetype);

    // objeto a modificar
    let objetoRecibido = JSON.parse(request.body.obj);

    let ubicacion : string = archivo.destination + objetoRecibido.codigo + "." + tipoExtension; 
    fs.renameSync(archivo.path, ubicacion);

    objetoRecibido.path = ubicacion.split("public/")[1];

    let objeto_modificar : any = {};

    objeto_modificar.marca = objetoRecibido.marca;
    objeto_modificar.precio = objetoRecibido.precio;
    objeto_modificar.path = objetoRecibido.path;

    console.log(objeto_modificar);

    request.getConnection((error : any, conexion : any)=>{
        if (error)
            throw(ERROR_DB);

        conexion.query("update productos set ? where codigo = ?", [objeto_modificar, objetoRecibido.codigo], 
        (error : any , rows : any) =>{
            if (error)
                throw("error en realizar la modificacion");

            response.send("productos modificado");
        });
    });
});

// eliminar
app.post("/productos_bd/eliminar", solo_admin, (request:any, response : any, obj : any) =>{
    let objeto_eliminar = request.body;
    
    let ubicacion_foto : string = "public/";

    request.getConnection((error: any, conexion : any)=>{
        if (error) 
            throw(ERROR_DB);

        conexion.query("select path from productos where codigo = ?", [objeto_eliminar.codigo], 
        (error : any, rows : any) =>{

            if (error)
                throw("error en realizar la busqueda del path");

            ubicacion_foto += rows[0].path;

        });
    });

    request.getConnection( (error: any, conexion : any) =>{
        if (error)
            throw(ERROR_DB);
            conexion.query("delete from productos where codigo = ?", [objeto_eliminar.codigo],
            (error : any, rows : any )=>{
                
                fs.unlink(ubicacion_foto, (error : any) =>{
                    if (error) throw(error);

                    console.log(ubicacion_foto + " <=== fue borrado");
                })
                response.send("el producto fue eliminado");
            });
    })
})

/************************* */
/* ----------------- */
/************************* */
app.listen(app.get('puerto'), ()=>{
    console.log('Servidor corriendo sobre puerto:', app.get('puerto'));
});

