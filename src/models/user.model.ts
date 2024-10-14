import { IUserDocument } from "@app/interfaces/user.interface";
import { sequelize } from "@app/server/database";
import { DataTypes, Model, ModelDefined, Optional } from "sequelize";
import { compare, hash } from "bcryptjs";

const SALT_ROUND = 10;

interface UserModelInstanceMethods extends Model {
  prototype: {
    comparePassword(password: string, hashedPassword: string): Promise<boolean>;
    hashPassword(password: string): Promise<string>;
  };
}

type UsercreationAttributes = Optional<IUserDocument, "id" | "createdAt">;

const UserModel: ModelDefined<IUserDocument, UsercreationAttributes> &
  UserModelInstanceMethods = sequelize.define(
  "users",
  {
    username: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    googleId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    facebookId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: Date.now,
    },
  },
  {
    indexes: [
      {
        unique: true,
        fields: ["email"],
      },
      {
        unique: true,
        fields: ["username"],
      },
    ],
  }
) as ModelDefined<IUserDocument, UsercreationAttributes> &
  UserModelInstanceMethods;

UserModel.addHook("beforeCreate", async (auth: Model) => {
  if (auth.dataValues.password !== undefined) {
    const hashedPassword: string = await hash(
      auth.dataValues.password,
      SALT_ROUND
    );
    auth.dataValues.password = hashedPassword;
  }
});

UserModel.prototype.comparePassword = async function (
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return compare(password, hashedPassword);
};

UserModel.prototype.hashPassword = async function (
  password: string
): Promise<string> {
  return hash(password, SALT_ROUND);
};

export { UserModel };
