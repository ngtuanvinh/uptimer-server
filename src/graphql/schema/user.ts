import { buildSchema } from "graphql";

export const userSchema = buildSchema(`#graphql
    input Auth {
        username: String
        email: String
        password: String
        socialId: String
        type: String
    }

    type User {
        id: Int
        username: String
        email: String
        createdAt: String
        googleId: String
        facebookId: String
    }

    type NotficationResult {
        id: ID!
        userId: Int!
        groupName: String!
        emails: String!
    }

    type AuthResponse {
        user: User!
        notifications: [NotficationResult!]!
    }

    type AuthLogoutResponse {
        message: String
    }

    type CurrentUserReponse {
        user: User
        notifications: [NotficationResult]
    }

    type Query {
        checkCurrentUser: CurrentUserReponse
    }

    type Mutation {
        loginUser(username: String!, password: String!): AuthResponse!
        registerUser(user: Auth!): AuthResponse!
        authSocialUser(user: Auth!): AuthResponse!
        logout: AuthLogoutResponse
    }
`);
