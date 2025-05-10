import { createFromRoot } from 'codama';
import { AnchorIdl, rootNodeFromAnchor } from '@codama/nodes-from-anchor';
// @ts-ignore
// import anchorIdl from '../target/idl/arbor_program.json';
import fs from 'fs';




const idlFile = fs.readFileSync('../target/idl/arbor_program.json', 'utf8');
const anchorIdl = JSON.parse(idlFile);
const codama = createFromRoot(rootNodeFromAnchor(anchorIdl as unknown as AnchorIdl));

