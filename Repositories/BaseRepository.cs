using MySql.Data.MySqlClient;

namespace DevTrack.Repositories
{
    public abstract class BaseRepository
    {
        protected readonly IDbConnectionFactory connectionFactory;

        public BaseRepository(IDbConnectionFactory connectionFactory)
        {
            this.connectionFactory = connectionFactory;
        }

        // Add common methods like ExecuteQuery, ExecuteNonQuery, etc.
    }
}