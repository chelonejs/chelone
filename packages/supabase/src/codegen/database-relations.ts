import ts from "typescript";

export interface DatabaseRelation {
  name: string;
  kind: "table" | "view";
  references: { column: string; relation: string }[];
}

const memberName = (member: ts.TypeElement): string | undefined => {
  if (!ts.isPropertySignature(member)) return undefined;
  const { name } = member;
  return ts.isIdentifier(name) || ts.isStringLiteral(name)
    ? name.text
    : undefined;
};

const typeLiteralOf = (
  node: ts.TypeNode | undefined,
): ts.TypeLiteralNode | undefined =>
  node !== undefined && ts.isTypeLiteralNode(node) ? node : undefined;

const propertyType = (
  literal: ts.TypeLiteralNode,
  name: string,
): ts.TypeNode | undefined => {
  for (const member of literal.members) {
    if (memberName(member) === name && ts.isPropertySignature(member)) {
      return member.type;
    }
  }
  return undefined;
};

const stringLiteralOf = (node: ts.TypeNode | undefined): string | undefined =>
  node !== undefined &&
  ts.isLiteralTypeNode(node) &&
  ts.isStringLiteral(node.literal)
    ? node.literal.text
    : undefined;

const findDatabaseType = (
  sourceFile: ts.SourceFile,
): ts.TypeLiteralNode | undefined => {
  for (const statement of sourceFile.statements) {
    if (
      ts.isTypeAliasDeclaration(statement) &&
      statement.name.text === "Database"
    ) {
      return typeLiteralOf(statement.type);
    }
  }
  return undefined;
};

/** A one-column foreign key becomes a reference; a compound one has no single column to point at. */
const referencesOf = (
  relation: ts.TypeLiteralNode,
): DatabaseRelation["references"] => {
  const relationships = propertyType(relation, "Relationships");
  if (relationships === undefined || !ts.isTupleTypeNode(relationships)) {
    return [];
  }
  const references: DatabaseRelation["references"] = [];
  for (const element of relationships.elements) {
    const foreignKey = typeLiteralOf(element);
    if (foreignKey === undefined) continue;
    const columns = propertyType(foreignKey, "columns");
    const target = stringLiteralOf(
      propertyType(foreignKey, "referencedRelation"),
    );
    if (columns === undefined || !ts.isTupleTypeNode(columns)) continue;
    if (columns.elements.length !== 1 || target === undefined) continue;
    const column = stringLiteralOf(columns.elements[0]);
    if (column !== undefined) references.push({ column, relation: target });
  }
  return references;
};

const relationsOf = (
  schema: ts.TypeLiteralNode,
  group: "Tables" | "Views",
  kind: DatabaseRelation["kind"],
): DatabaseRelation[] => {
  const members = typeLiteralOf(propertyType(schema, group));
  if (members === undefined) return [];
  const relations: DatabaseRelation[] = [];
  for (const member of members.members) {
    const name = memberName(member);
    if (name === undefined || !ts.isPropertySignature(member)) continue;
    const row = typeLiteralOf(member.type);
    relations.push({
      name,
      kind,
      references: row === undefined ? [] : referencesOf(row),
    });
  }
  return relations;
};

/**
 * Reads the tables, views and one-column foreign keys of `schema` from the
 * text of a `supabase gen types typescript` file. Tables come before views,
 * each in the order the file lists them.
 */
export function readDatabaseRelations(
  sourceText: string,
  schema: string,
): DatabaseRelation[] {
  const sourceFile = ts.createSourceFile(
    "database.types.ts",
    sourceText,
    ts.ScriptTarget.Latest,
    true,
  );
  const database = findDatabaseType(sourceFile);
  if (database === undefined) {
    throw new Error("No `Database` type found in the Supabase types file.");
  }
  const schemaType =
    schema === "__InternalSupabase"
      ? undefined
      : typeLiteralOf(propertyType(database, schema));
  if (schemaType === undefined) {
    throw new Error(`The \`Database\` type has no \`${schema}\` schema.`);
  }
  return [
    ...relationsOf(schemaType, "Tables", "table"),
    ...relationsOf(schemaType, "Views", "view"),
  ];
}
