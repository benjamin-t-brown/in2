'use strict';

var fs = require( 'fs' );

module.exports = class Player {
  constructor( name ){
    this.state = {};
    this.name = name;
  }
  
  writeSave( cb ){
    var save_url = './saves/' + name + '.sav';
    fs.writeFile( save_url, ( err ) => {
      if( err ){
        console.log( 'Error reading save at "' + save_url + '"' );
      }
      cb();
    } );
  }

  loadSave( cb ){ 
    var save_url = './saves/' + name + '.sav';
    fs.readFile( save_url, ( err, data ) => {
      if( err ){
        console.log( 'Error loading save at "' + save_url + '"');
      }
      try {
        this.state = JSON.parse( data.toString() );
      } catch( e ) {
        console.log( 'Error loading save at "' + save_url + '", malformed save file.' );
      }
      cb();
    } );
  }

  print(){
    console.log( this.state );
  }

  get( key ){
    return this.state[ key ] || null;
  }

  set( path, val ){
    this.state[ path ] = val;
  }
};

