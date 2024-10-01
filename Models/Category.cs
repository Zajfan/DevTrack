using MySql.Data.MySqlClient;

namespace DevTrack.DAL
{
    public class Category
    {
        public int CategoryID { get; set; }
        public string CategoryName { get; set; }

        public Category() { }

        public Category(MySqlDataReader reader)
        {
            CategoryID = reader.GetInt32("CategoryID");
            CategoryName = reader.GetString("CategoryName");
        }
    }
}